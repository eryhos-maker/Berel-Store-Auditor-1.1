/**
 * Auditorías Ferre Don Nico · base de datos en Google Sheets
 * Se pega en la hoja (Extensiones > Apps Script) y se publica como "Aplicación web".
 * Ver INSTRUCCIONES.md.
 *
 * La app manda POST con Content-Type text/plain y el cuerpo en JSON:
 *   { "accion": "getStores", "clave": "...", ...datos }
 * y recibe { ok: true, datos: ... } o { ok: false, error: "mensaje" }.
 *
 * Seguridad: cada petición debe traer la clave guardada en Propiedades del script (CLAVE).
 * Fotos y firmas se guardan en Drive (Auditorías/Fotos y Auditorías/Firmas); en la hoja va el link.
 */

var VERSION_SCRIPT = '1.0';
var ZONA = 'America/Mexico_City';

// Pestañas y encabezados (fila 1). El orden puede cambiar en la hoja: se busca por nombre.
var ESQUEMA = {
  Tiendas: ['ID', 'Nombre', 'Sucursal', 'Almacén', 'Activo'],
  Personal: ['ID', 'Nombre', 'Rol', 'Nómina', 'Departamento', 'Activo'],
  Berel_Auditorias: ['ID', 'Folio', 'Fecha', 'Hora', 'ID tienda', 'Tienda', 'ID gerente', 'Gerente',
    'ID auditor', 'Auditor', 'Puntaje', 'Estatus', 'Plan de acción', 'Firma gerente', 'Firma auditor', 'Registrado'],
  Berel_Resultados: ['Folio', 'ID pregunta', 'Puntos', 'Observación'],
};

// Columnas que se guardan como número (para poder sumar y promediar en la hoja). Las demás, como texto.
var NUMERICAS = ['Puntaje', 'Puntos'];

// ---------------------------------------------------------------- entrada

function doGet(e) {
  return responder_({ ok: true, mensaje: 'Auditorías Ferre Don Nico activo', version: VERSION_SCRIPT });
}

function doPost(e) {
  var pet;
  try {
    pet = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder_({ ok: false, error: 'Petición inválida.' });
  }
  var clave = PropertiesService.getScriptProperties().getProperty('CLAVE');
  if (!clave) return responder_({ ok: false, error: 'Falta configurar la CLAVE en Propiedades del script.' });
  if (pet.clave !== clave) return responder_({ ok: false, error: 'La clave de acceso no es correcta.' });

  try {
    return responder_({ ok: true, datos: ejecutar_(pet) });
  } catch (err) {
    return responder_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// Las lecturas no bloquean; todo lo que escribe pasa por conCandado_ para que dos celulares no se pisen.
function ejecutar_(pet) {
  switch (pet.accion) {
    case 'ping':
      return { version: VERSION_SCRIPT, libro: SpreadsheetApp.getActiveSpreadsheet().getName() };
    case 'getStores':
      return leerObjetos_('Tiendas').filter(activo_).map(function (t) {
        return { id: t['ID'], name: t['Nombre'], branch: t['Sucursal'], warehouse: t['Almacén'] };
      });
    case 'getPeople':
      return leerObjetos_('Personal').filter(activo_).map(function (p) {
        return { id: p['ID'], name: p['Nombre'], role: p['Rol'], payrollId: p['Nómina'], department: p['Departamento'] };
      });
    case 'addStore':
      return conCandado_(function () {
        var t = pet.tienda || {};
        return agregarFila_('Tiendas', { 'ID': t.id, 'Nombre': t.name, 'Sucursal': t.branch, 'Almacén': t.warehouse });
      });
    case 'addPerson':
      return conCandado_(function () {
        var p = pet.persona || {};
        return agregarFila_('Personal', { 'ID': p.id, 'Nombre': p.name, 'Rol': p.role, 'Nómina': p.payrollId, 'Departamento': p.department });
      });
    case 'saveAudit':
      return conCandado_(function () { return guardarAuditoriaBerel_(pet.auditoria); });
    case 'getAudits':
      return leerAuditoriasBerel_();
    case 'deleteAudit':
      return conCandado_(function () { return borrarAuditoriaBerel_(pet.id); });
    case 'imagen':
      return leerImagen_(pet.url);
    default:
      throw new Error('Acción desconocida: ' + pet.accion);
  }
}

function conCandado_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('La hoja está ocupada guardando otra auditoría. Intenta de nuevo en unos segundos.');
  try {
    return fn();
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

/** Crea las pestañas que falten con sus encabezados. Se puede correr las veces que sea. */
function setup() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var creadas = [];
  Object.keys(ESQUEMA).forEach(function (nombre) {
    if (!libro.getSheetByName(nombre)) creadas.push(nombre);
    hoja_(nombre);
  });
  carpeta_('Fotos');
  carpeta_('Firmas');
  var msg = creadas.length ? 'Pestañas creadas: ' + creadas.join(', ') : 'Todas las pestañas ya existían.';
  Logger.log(msg);
  return msg;
}

// ---------------------------------------------------------------- Berel

function guardarAuditoriaBerel_(a) {
  if (!a) throw new Error('No llegó la auditoría.');
  if (!a.id) throw new Error('A la auditoría le falta su identificador.');
  if (!a.storeId || !a.managerId || !a.auditorId) throw new Error('Faltan la tienda, el gerente o el auditor.');

  // Si el celular reintenta (se cortó la señal), se regresa la auditoría que ya quedó guardada.
  var previa = buscarObjeto_('Berel_Auditorias', 'ID', a.id);
  if (previa) return { id: previa['ID'], folio: previa['Folio'], managerSignature: previa['Firma gerente'], auditorSignature: previa['Firma auditor'] };

  var folio = siguienteFolio_('Berel_Auditorias', 'AB');
  var firmaGerente = guardarImagen_(a.managerSignature, 'Firmas', folio + '_gerente');
  var firmaAuditor = guardarImagen_(a.auditorSignature, 'Firmas', folio + '_auditor');

  agregarFila_('Berel_Auditorias', {
    'ID': a.id,
    'Folio': folio,
    'Fecha': a.date,
    'Hora': a.time,
    'ID tienda': a.storeId,
    'Tienda': a.storeName,
    'ID gerente': a.managerId,
    'Gerente': a.managerName,
    'ID auditor': a.auditorId,
    'Auditor': a.auditorName,
    'Puntaje': a.totalScore,
    'Estatus': a.status,
    'Plan de acción': a.actionPlan || '',
    'Firma gerente': firmaGerente,
    'Firma auditor': firmaAuditor,
    'Registrado': ahora_(),
  });
  var items = a.items || {};
  agregarFilas_('Berel_Resultados', Object.keys(items).map(function (k) {
    return { 'Folio': folio, 'ID pregunta': items[k].questionId, 'Puntos': items[k].score, 'Observación': items[k].observation || '' };
  }));
  return { id: a.id, folio: folio, managerSignature: firmaGerente, auditorSignature: firmaAuditor };
}

function leerAuditoriasBerel_() {
  var porFolio = {};
  leerObjetos_('Berel_Resultados').forEach(function (r) {
    (porFolio[r['Folio']] = porFolio[r['Folio']] || []).push({
      questionId: r['ID pregunta'],
      score: Number(r['Puntos']) || 0,
      observation: r['Observación'],
    });
  });
  return leerObjetos_('Berel_Auditorias').map(function (a) {
    return {
      id: a['ID'],
      folio: a['Folio'],
      date: a['Fecha'],
      time: a['Hora'],
      storeId: a['ID tienda'],
      storeName: a['Tienda'],
      managerId: a['ID gerente'],
      managerName: a['Gerente'],
      auditorId: a['ID auditor'],
      auditorName: a['Auditor'],
      actionPlan: a['Plan de acción'],
      managerSignature: a['Firma gerente'],
      auditorSignature: a['Firma auditor'],
      registered: a['Registrado'],
      items: porFolio[a['Folio']] || [],
    };
  });
}

function borrarAuditoriaBerel_(id) {
  var a = buscarObjeto_('Berel_Auditorias', 'ID', id);
  if (!a) return { borradas: 0 };
  borrarFilas_('Berel_Resultados', 'Folio', a['Folio']);
  return { borradas: borrarFilas_('Berel_Auditorias', 'ID', id) };
}

// ---------------------------------------------------------------- folios

/** PREFIJO-AAAAMMDD-0001: consecutivo del día, buscando el mayor ya usado en la pestaña. */
function siguienteFolio_(nombreHoja, prefijo) {
  var base = prefijo + '-' + Utilities.formatDate(new Date(), ZONA, 'yyyyMMdd') + '-';
  var mayor = 0;
  leerObjetos_(nombreHoja).forEach(function (o) {
    var f = String(o['Folio'] || '');
    if (f.indexOf(base) === 0) mayor = Math.max(mayor, Number(f.slice(base.length)) || 0);
  });
  return base + ('000' + (mayor + 1)).slice(-4);
}

// ---------------------------------------------------------------- imágenes en Drive

/** Guarda una imagen base64 (data:image/...) en Auditorías/<sub> y regresa su link. Si ya es link, lo deja igual. */
function guardarImagen_(dataUrl, sub, nombre) {
  if (!dataUrl) return '';
  var m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) return String(dataUrl);
  var ext = m[1].split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
  var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], nombre + '.' + ext);
  var archivo = carpeta_(sub).createFile(blob);
  try {
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    // Algunas cuentas no permiten compartir por link; el archivo queda privado y la app lo lee por el script.
  }
  return 'https://drive.google.com/file/d/' + archivo.getId() + '/view';
}

/** Regresa una imagen de Drive como data URL para mostrarla en el reporte y en el PDF. */
function leerImagen_(url) {
  var m = /[-\w]{25,}/.exec(String(url || ''));
  if (!m) throw new Error('Link de imagen inválido.');
  var archivo = DriveApp.getFileById(m[0]);
  var padres = archivo.getParents();
  var raiz = carpetaRaiz_().getId();
  var permitido = false;
  while (padres.hasNext()) {
    var p = padres.next();
    var abuelos = p.getParents();
    while (abuelos.hasNext()) if (abuelos.next().getId() === raiz) permitido = true;
  }
  if (!permitido) throw new Error('Esa imagen no es de la carpeta Auditorías.');
  var blob = archivo.getBlob();
  return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
}

function carpetaRaiz_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('CARPETA_AUDITORIAS');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (err) { /* la borraron: se crea otra */ }
  }
  var it = DriveApp.getRootFolder().getFoldersByName('Auditorías');
  var c = it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder('Auditorías');
  props.setProperty('CARPETA_AUDITORIAS', c.getId());
  return c;
}

function carpeta_(sub) {
  var raiz = carpetaRaiz_();
  var it = raiz.getFoldersByName(sub);
  return it.hasNext() ? it.next() : raiz.createFolder(sub);
}

// ---------------------------------------------------------------- hojas

function hoja_(nombre) {
  var encabezados = ESQUEMA[nombre];
  if (!encabezados) throw new Error('Pestaña desconocida: ' + nombre);
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var h = libro.getSheetByName(nombre);
  if (!h) h = libro.insertSheet(nombre);
  if (h.getLastRow() < 1) {
    h.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight('bold');
    h.setFrozenRows(1);
  }
  // Si en la hoja falta alguna columna que la app usa, se agrega al final.
  var actuales = encabezadosDe_(h);
  var faltan = encabezados.filter(function (e) { return actuales.indexOf(e) < 0; });
  if (faltan.length) h.getRange(1, actuales.length + 1, 1, faltan.length).setValues([faltan]).setFontWeight('bold');
  return h;
}

function encabezadosDe_(h) {
  if (h.getLastColumn() < 1) return [];
  var enc = h.getRange(1, 1, 1, h.getLastColumn()).getDisplayValues()[0].map(function (e) { return String(e).trim(); });
  while (enc.length && enc[enc.length - 1] === '') enc.pop();
  return enc;
}

/** Todas las filas como objetos { encabezado: valor }. Los números se leen tal cual; lo demás como se ve. */
function leerObjetos_(nombre) {
  var h = hoja_(nombre);
  var enc = encabezadosDe_(h);
  if (h.getLastRow() < 2) return [];
  var rango = h.getRange(2, 1, h.getLastRow() - 1, enc.length);
  var texto = rango.getDisplayValues();
  var crudo = rango.getValues();
  var res = [];
  texto.forEach(function (fila, i) {
    if (fila.join('') === '') return;
    var o = {};
    enc.forEach(function (e, j) { o[e] = NUMERICAS.indexOf(e) >= 0 && typeof crudo[i][j] === 'number' ? crudo[i][j] : fila[j]; });
    res.push(o);
  });
  return res;
}

function buscarObjeto_(nombre, columna, valor) {
  if (valor === undefined || valor === null || String(valor) === '') return null;
  var lista = leerObjetos_(nombre);
  for (var i = 0; i < lista.length; i++) if (String(lista[i][columna]) === String(valor)) return lista[i];
  return null;
}

function agregarFila_(nombre, obj) {
  if (!obj) throw new Error('No llegaron datos para ' + nombre + '.');
  if (ESQUEMA[nombre].indexOf('ID') >= 0 && !obj['ID']) obj['ID'] = Utilities.getUuid();
  if (ESQUEMA[nombre].indexOf('Activo') >= 0 && !obj['Activo']) obj['Activo'] = 'Sí';
  agregarFilas_(nombre, [obj]);
  return { id: obj['ID'] };
}

function agregarFilas_(nombre, objetos) {
  if (!objetos.length) return 0;
  var h = hoja_(nombre);
  var enc = encabezadosDe_(h);
  var filas = objetos.map(function (o) {
    return enc.map(function (e) {
      var v = o[e];
      if (v === undefined || v === null) return '';
      return NUMERICAS.indexOf(e) >= 0 ? Number(v) || 0 : String(v);
    });
  });
  var inicio = h.getLastRow() + 1;
  // Texto para que Sheets no convierta fechas, horas ni folios; los números se dejan como número.
  enc.forEach(function (e, j) {
    if (NUMERICAS.indexOf(e) < 0) h.getRange(inicio, j + 1, filas.length, 1).setNumberFormat('@');
  });
  h.getRange(inicio, 1, filas.length, enc.length).setValues(filas);
  return filas.length;
}

/** Borra las filas cuya columna tiene exactamente ese valor. */
function borrarFilas_(nombre, columna, valor) {
  if (valor === undefined || valor === null || String(valor) === '') throw new Error('Falta el valor de las filas a borrar.');
  var h = hoja_(nombre);
  if (h.getLastRow() < 2) return 0;
  var i = encabezadosDe_(h).indexOf(columna);
  if (i < 0) throw new Error('No existe la columna ' + columna + ' en ' + nombre);
  var valores = h.getRange(2, i + 1, h.getLastRow() - 1, 1).getDisplayValues();
  var borradas = 0;
  // De abajo hacia arriba para que los números de fila no se recorran.
  for (var f = valores.length - 1; f >= 0; f--) {
    if (valores[f][0] === String(valor)) {
      h.deleteRow(f + 2);
      borradas++;
    }
  }
  return borradas;
}

function activo_(o) {
  var v = String(o['Activo'] || '').trim().toLowerCase();
  return v !== 'no' && v !== 'n' && v !== 'false' && v !== '0';
}

function ahora_() {
  return Utilities.formatDate(new Date(), ZONA, 'yyyy-MM-dd HH:mm:ss');
}

function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
