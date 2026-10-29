// Simulador local de la hoja de Google (solo para pruebas en la PC, no se despliega).
// Corre apps-script/Code.gs tal cual, con imitaciones en memoria de Sheets, Drive y compañía.
//
//   node scripts/simulador-hoja.mjs            → escucha en http://localhost:8788/exec (clave: prueba)
//   SIM_DATOS=ruta.json node scripts/...       → guarda el estado en ese archivo entre reinicios
//
// En la app: VITE_SHEETS_URL=http://localhost:8788/exec  VITE_SHEETS_KEY=prueba
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PUERTO = Number(process.env.SIM_PUERTO || 8788);
const ARCHIVO = process.env.SIM_DATOS || '';

// ---------------------------------------------------------------- estado
let estado = { hojas: {}, archivos: {}, carpetas: { root: { nombre: 'Mi unidad', padre: null } }, props: { CLAVE: 'prueba' } };
if (ARCHIVO && fs.existsSync(ARCHIVO)) estado = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
const guardar = () => { if (ARCHIVO) fs.writeFileSync(ARCHIVO, JSON.stringify(estado)); };

// ---------------------------------------------------------------- Sheets
function Hoja(nombre) {
  const datos = () => estado.hojas[nombre];
  const filas = () => datos().celdas;
  const ultimaFila = () => {
    const c = filas();
    for (let i = c.length - 1; i >= 0; i--) if (c[i].some(v => v !== '' && v !== null)) return i + 1;
    return 0;
  };
  const ultimaCol = () => filas().reduce((m, f) => { for (let j = f.length - 1; j >= 0; j--) if (f[j] !== '') return Math.max(m, j + 1); return m; }, 0);
  const celda = (r, c) => (filas()[r] || [])[c] ?? '';
  const poner = (r, c, v) => { while (filas().length <= r) filas().push([]); const f = filas()[r]; while (f.length <= c) f.push(''); f[c] = v; };
  const formato = (r, c) => datos().formatos[`${r},${c}`] || '';
  const self = {
    getName: () => nombre,
    getLastRow: ultimaFila,
    getLastColumn: ultimaCol,
    setFrozenRows: () => self,
    deleteRow: n => { filas().splice(n - 1, 1); return self; },
    clear: () => { datos().celdas = []; datos().formatos = {}; return self; },
    getRange: (r, c, nr = 1, nc = 1) => {
      if (typeof r === 'string') {
        // Notación A1 sencilla ("A4" o "A4:G4").
        const [ini, fin] = r.split(':');
        const pos = x => { const m = /^([A-Z]+)(\d+)$/.exec(x); return [Number(m[2]), [...m[1]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0)]; };
        const [f1, c1] = pos(ini);
        const [f2, c2] = fin ? pos(fin) : [f1, c1];
        return self.getRange(f1, c1, f2 - f1 + 1, c2 - c1 + 1);
      }
      const recorrer = fn => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => fn(r - 1 + i, c - 1 + j)));
      const rango = {
        getValues: () => recorrer(celda),
        getDisplayValues: () => recorrer((i, j) => String(celda(i, j))),
        setValues: v => {
          if (v.length !== nr || v.some(f => f.length !== nc)) throw new Error('setValues: tamaño no coincide');
          v.forEach((f, i) => f.forEach((x, j) => {
            const fi = r - 1 + i, cj = c - 1 + j;
            // Igual que Sheets: con formato de texto todo queda como texto; sin él, "95" se vuelve número.
            const val = formato(fi, cj) === '@' ? String(x) : (typeof x === 'string' && x !== '' && !isNaN(Number(x)) ? Number(x) : x);
            poner(fi, cj, val);
          }));
          return rango;
        },
        setNumberFormat: f => { recorrer((i, j) => { datos().formatos[`${i},${j}`] = f; }); return rango; },
        setFontWeight: () => rango,
        setFontColor: () => rango,
        getDisplayValue: () => String(celda(r - 1, c - 1)),
        setValue: v => rango.setValues([[v]]),
        // Las fórmulas no se calculan en el simulador: se guarda el texto para revisarlo.
        setFormula: f => { poner(r - 1, c - 1, f); return rango; },
      };
      return rango;
    },
  };
  return self;
}
const libro = {
  getName: () => 'Auditorías Ferre Don Nico (simulador)',
  getSheetByName: n => (estado.hojas[n] ? Hoja(n) : null),
  insertSheet: n => { estado.hojas[n] = { celdas: [], formatos: {} }; return Hoja(n); },
};

// ---------------------------------------------------------------- Drive
const iter = arr => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };
function Carpeta(id) {
  if (!estado.carpetas[id]) throw new Error('No existe la carpeta ' + id);
  return {
    getId: () => id,
    getName: () => estado.carpetas[id].nombre,
    getParents: () => iter(estado.carpetas[id].padre ? [Carpeta(estado.carpetas[id].padre)] : []),
    getFoldersByName: n => iter(Object.keys(estado.carpetas).filter(k => estado.carpetas[k].padre === id && estado.carpetas[k].nombre === n).map(Carpeta)),
    createFolder: n => { const k = crypto.randomBytes(16).toString('hex') + 'carpeta'; estado.carpetas[k] = { nombre: n, padre: id }; return Carpeta(k); },
    createFile: blob => {
      const k = crypto.randomBytes(16).toString('hex') + 'archivo';
      estado.archivos[k] = { nombre: blob.getName(), tipo: blob.getContentType(), b64: Buffer.from(blob.getBytes()).toString('base64'), padre: id };
      return Archivo(k);
    },
  };
}
function Archivo(id) {
  const a = estado.archivos[id];
  if (!a) throw new Error('No existe el archivo ' + id);
  return {
    getId: () => id,
    getName: () => a.nombre,
    getParents: () => iter([Carpeta(a.padre)]),
    setSharing: () => { a.compartido = true; },
    getBlob: () => Blob(Buffer.from(a.b64, 'base64'), a.tipo, a.nombre),
  };
}
function Blob(bytes, tipo, nombre) {
  return { getBytes: () => [...bytes], getContentType: () => tipo, getName: () => nombre };
}

// ---------------------------------------------------------------- resto de servicios de Apps Script
const zonaMx = (d, patron) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).map(x => [x.type, x.value]));
  return patron.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute).replace('ss', p.second);
};
const globales = {
  SpreadsheetApp: { getActiveSpreadsheet: () => libro, flush: () => {} },
  DriveApp: {
    getRootFolder: () => Carpeta('root'),
    getFolderById: Carpeta,
    getFileById: Archivo,
    Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' },
    Permission: { VIEW: 'VIEW' },
  },
  PropertiesService: {
    getScriptProperties: () => ({ getProperty: k => estado.props[k] ?? null, setProperty: (k, v) => { estado.props[k] = v; } }),
  },
  LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => {}, releaseLock: () => {} }) },
  Utilities: {
    formatDate: (d, _zona, patron) => zonaMx(d, patron),
    getUuid: () => crypto.randomUUID(),
    newBlob: (bytes, tipo, nombre) => Blob(Buffer.from(bytes), tipo, nombre),
    base64Decode: s => [...Buffer.from(s, 'base64')],
    base64Encode: b => Buffer.from(b).toString('base64'),
  },
  ContentService: {
    MimeType: { JSON: 'application/json' },
    createTextOutput: t => ({ setMimeType: () => ({ texto: t }) }),
  },
  Logger: { log: m => console.log('[Logger]', m) },
  console,
};
const ctx = vm.createContext(globales);
vm.runInContext(fs.readFileSync(path.join(raiz, 'apps-script', 'Code.gs'), 'utf8'), ctx, { filename: 'Code.gs' });

// ---------------------------------------------------------------- servidor
http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (req.method === 'GET' && req.url.startsWith('/estado')) {
    res.writeHead(200, cors);
    const hojas = Object.fromEntries(Object.keys(estado.hojas).map(n => [n, estado.hojas[n].celdas]));
    return res.end(JSON.stringify({ hojas, archivos: Object.fromEntries(Object.entries(estado.archivos).map(([k, a]) => [k, { nombre: a.nombre, padre: estado.carpetas[a.padre].nombre }])) }, null, 1));
  }
  if (req.method === 'GET') { res.writeHead(200, cors); return res.end(ctx.doGet({}).texto); }
  if (req.method !== 'POST') { res.writeHead(405); return res.end(); }
  if (req.headers['content-type'] && !req.headers['content-type'].startsWith('text/plain')) {
    // Apps Script real no contesta la consulta CORS de application/json: aquí se rechaza igual.
    res.writeHead(415, cors); return res.end('{"ok":false,"error":"Usa text/plain"}');
  }
  let cuerpo = '';
  req.on('data', d => { cuerpo += d; });
  req.on('end', () => {
    let salida;
    try { salida = ctx.doPost({ postData: { contents: cuerpo } }).texto; } catch (e) { salida = JSON.stringify({ ok: false, error: 'Simulador: ' + e.message }); }
    guardar();
    res.writeHead(200, cors);
    res.end(salida);
  });
}).listen(PUERTO, () => console.log(`Simulador de la hoja en http://localhost:${PUERTO}/exec (clave: ${estado.props.CLAVE})`));

export { ctx };
