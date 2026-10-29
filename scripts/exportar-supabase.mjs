// Exporta lo que hay en Supabase a CSV con el formato de las pestañas de Google Sheets.
//
//   node scripts/exportar-supabase.mjs [carpeta-salida]
//
// Genera Tiendas.csv, Personal.csv, Berel_Auditorias.csv y Berel_Resultados.csv (UTF-8),
// listos para Archivo > Importar > Subir > "Anexar a la hoja actual" en cada pestaña.
// Las firmas no caben en una celda: se guardan como PNG en <salida>/firmas (una por persona,
// porque Supabase solo guardaba la última firma de cada quien) y la columna de firma va vacía.
import fs from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xnzjsogdymsaefjxeeby.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_1ZnmuRAcVix0WWoU4KQ1tg_W0HLLVAr';
const SALIDA = process.argv[2] || 'exportacion-supabase';

// Pregunta de la app → columna en calificaciones_auditoria (igual que el storageService anterior).
const PREGUNTAS = {
  '1.1': 'arqueo_de_caja', '1.2': 'fondo_fijo', '1.3': 'auditoria_aleatoria', '1.4': 'carpeta_operativa',
  '1.5': 'cortes_de_terminal', '2.1': 'pintura_de_fachada', '2.2': 'marquesina_anuncios', '2.3': 'accesibilidad',
  '2.4': 'vidrios_y_escaparate', '3.1': 'orden_y_limpieza', '3.2': 'frenteo_de_producto', '3.3': 'precios',
  '3.4': 'layout_estrategico', '3.5': 'iluminacion_interior', '4.1': 'dosificadora_limpieza',
  '4.2': 'dosificadora_niveles', '4.3': 'revolvedora_estado', '4.4': 'area_de_igualacion',
  '5.1': 'imagen_personal', '5.2': 'protocolo_de_saludo', '5.3': 'venta_sugestiva',
};

async function leerTabla(tabla) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    let r;
    try {
      r = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?select=*`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Range: `${desde}-${desde + 999}` },
      });
    } catch (e) {
      throw new Error(`No se pudo conectar con Supabase (${SUPABASE_URL}). ¿El proyecto está pausado o fue borrado? Detalle: ${e.cause?.code || e.message}`);
    }
    if (!r.ok) throw new Error(`Supabase respondió ${r.status} al leer ${tabla}: ${await r.text()}`);
    const lote = await r.json();
    filas.push(...lote);
    if (lote.length < 1000) return filas;
  }
}

const csv = (encabezados, filas) => '﻿' + [encabezados, ...filas]
  .map(f => f.map(v => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(','))
  .join('\r\n') + '\r\n';

const estatus = total => (total >= 95 ? 'TIENDA_MODELO' : total >= 85 ? 'ACEPTABLE' : 'CRITICO');

async function main() {
  const [tiendas, encargados, auditores, auditorias, calificaciones] = await Promise.all(
    ['tienda', 'encargado', 'auditor', 'datos_auditoria', 'calificaciones_auditoria'].map(leerTabla),
  );
  fs.mkdirSync(path.join(SALIDA, 'firmas'), { recursive: true });

  const porId = lista => Object.fromEntries(lista.map(x => [x.id, x]));
  const T = porId(tiendas), E = porId(encargados), A = porId(auditores);

  const guardarFirma = (persona, campo, rol) => {
    const m = /^data:image\/(\w+);base64,(.+)$/.exec(persona?.[campo] || '');
    if (!m) return 0;
    const nombre = `${rol}_${(persona.nombre || persona.id).replace(/[^\wÁÉÍÓÚÑáéíóúñ ]/g, '').trim().replace(/\s+/g, '_')}.${m[1]}`;
    fs.writeFileSync(path.join(SALIDA, 'firmas', nombre), Buffer.from(m[2], 'base64'));
    return 1;
  };
  let firmas = 0;
  encargados.forEach(e => { firmas += guardarFirma(e, 'firma_encargado', 'gerente'); });
  auditores.forEach(a => { firmas += guardarFirma(a, 'firma_auditor', 'auditor'); });

  fs.writeFileSync(path.join(SALIDA, 'Tiendas.csv'), csv(
    ['ID', 'Nombre', 'Sucursal', 'Almacén', 'Activo'],
    tiendas.map(t => [t.id, t.nombre, t.sucursal, t.almacen, 'Sí']),
  ));
  fs.writeFileSync(path.join(SALIDA, 'Personal.csv'), csv(
    ['ID', 'Nombre', 'Rol', 'Nómina', 'Departamento', 'Activo'],
    [
      ...encargados.map(e => [e.id, e.nombre, 'Gerente', e.nomina, e.departamento, 'Sí']),
      ...auditores.map(a => [a.id, a.nombre, 'Auditor', a.nomina, a.departamento, 'Sí']),
    ],
  ));

  const califPorAuditoria = {};
  calificaciones.forEach(c => { califPorAuditoria[c.datos_auditoria_id] = c; });

  const encabezado = [];
  const resultados = [];
  let sinCalificaciones = 0;
  auditorias
    .sort((x, y) => String(x.created_at).localeCompare(String(y.created_at)))
    .forEach(a => {
      const c = califPorAuditoria[a.id];
      let total = 0;
      if (!c) sinCalificaciones++;
      else Object.entries(PREGUNTAS).forEach(([id, col]) => {
        if (c[col] === null || c[col] === undefined) return;
        total += Number(c[col]) || 0;
        resultados.push([a.folio, id, c[col], c[`${col}_obs`] || '']);
      });
      encabezado.push([
        a.id, a.folio, a.fecha, String(a.hora || '').slice(0, 5),
        a.tienda_id, T[a.tienda_id]?.nombre || '', a.gerente_encargado_id, E[a.gerente_encargado_id]?.nombre || '',
        a.auditor_id, A[a.auditor_id]?.nombre || '', total, estatus(total), a.plan_accion || '', '', '',
        String(a.created_at || '').replace('T', ' ').slice(0, 19),
      ]);
    });
  fs.writeFileSync(path.join(SALIDA, 'Berel_Auditorias.csv'), csv(
    ['ID', 'Folio', 'Fecha', 'Hora', 'ID tienda', 'Tienda', 'ID gerente', 'Gerente', 'ID auditor', 'Auditor',
      'Puntaje', 'Estatus', 'Plan de acción', 'Firma gerente', 'Firma auditor', 'Registrado'],
    encabezado,
  ));
  fs.writeFileSync(path.join(SALIDA, 'Berel_Resultados.csv'), csv(['Folio', 'ID pregunta', 'Puntos', 'Observación'], resultados));

  console.log(`Listo en ${path.resolve(SALIDA)}`);
  console.log(`  Tiendas: ${tiendas.length}`);
  console.log(`  Personal: ${encargados.length} gerentes + ${auditores.length} auditores`);
  console.log(`  Auditorías: ${auditorias.length} (${sinCalificaciones} sin calificaciones)`);
  console.log(`  Resultados (una fila por pregunta): ${resultados.length}`);
  console.log(`  Firmas guardadas como imagen: ${firmas}`);
}

main().catch(e => { console.error('\n' + e.message); process.exit(1); });
