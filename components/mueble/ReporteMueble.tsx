import React, { useState } from 'react';
import { AuditoriaMueble } from '../../types';
import { SemaforoChip } from './SemaforoChip';
import ImagenDrive from '../ImagenDrive';

import { guardarPdfUnaHoja } from '../../services/pdfUnaHoja';

interface Props {
  auditoria: AuditoriaMueble;
  onClose: () => void;
  textoCerrar?: string;
  onOtra?: () => void;
}

const SEMAFORO_TEXTO: Record<string, string> = { VERDE: '🟢 Verde', AMARILLO: '🟡 Amarillo', ROJO: '🔴 Rojo' };

const fechaCorta = (f: string) => {
  const [a, m, d] = (f || '').split('-');
  return a && m && d ? `${d}/${m}/${a}` : f;
};

/** Suma por bloque a partir de las filas de resultados (sirve igual al capturar que al leer de la hoja). */
export function resumenPorBloque(a: AuditoriaMueble) {
  const orden: string[] = [];
  const bloques: Record<string, { obtenidos: number; posibles: number; na: boolean }> = {};
  a.resultados.forEach(r => {
    if (!bloques[r.bloque]) {
      orden.push(r.bloque);
      bloques[r.bloque] = { obtenidos: 0, posibles: 0, na: true };
    }
    const b = bloques[r.bloque];
    b.obtenidos += Number(r.obtenidos) || 0;
    b.posibles += Number(r.posibles) || 0;
    if (r.resultado !== 'N/A') b.na = false;
  });
  return orden.map(t => ({ titulo: t, ...bloques[t] }));
}

export function textoWhatsApp(a: AuditoriaMueble): string {
  const c = a.calificacion;
  const lineas = [
    '*🗄️ SUPERVISIÓN DE MUEBLE · FERRE MINA*',
    '',
    `*Folio:* ${a.folio}`,
    `*Fecha:* ${fechaCorta(a.fecha)} ${a.hora}`,
    `*Mueble:* ${a.mueble.numero} · ${a.mueble.familias}`,
    `*Titular:* ${a.mueble.titular}`,
    `*Atendió:* ${a.atendio}`,
    `*Auditor:* ${a.auditor}`,
    '',
    `*Calificación:* ${c.calificacion}/100 ${SEMAFORO_TEXTO[c.semaforo] || c.semaforo}`,
  ];
  if (a.servicioNA) lineas.push('_Sin cliente en la zona: calificado sobre 85 pts._');
  if (c.criticosFallados.length) lineas.push(`⚠️ *Falla crítica:* ${c.criticosFallados.join(', ')}`);
  lineas.push('');
  resumenPorBloque(a).forEach(b => lineas.push(`• ${b.titulo}: ${b.na ? 'N/A' : `${b.obtenidos}/${b.posibles}`}`));
  const plan = a.resultados.filter(r => r.resultado === 'No cumple');
  if (plan.length) {
    lineas.push('', '*Plan de acción*');
    plan.forEach(r => {
      const e = a.evidencias[r.punto];
      lineas.push(`❌ ${r.punto} ${r.descripcion}`);
      if (r.observacion) lineas.push(`   Se encontró: ${r.observacion}`);
      if (e) lineas.push(`   ➜ ${e.accion} · ${e.responsable} · antes del ${fechaCorta(e.fechaCompromiso)}`);
    });
  } else {
    lineas.push('', '✅ Sin puntos por corregir.');
  }
  return lineas.join('\n');
}

const ReporteMueble: React.FC<Props> = ({ auditoria: a, onClose, textoCerrar = 'Volver', onOtra }) => {
  const [generando, setGenerando] = useState(false);
  const c = a.calificacion;
  const bloques = resumenPorBloque(a);
  const plan = a.resultados.filter(r => r.resultado === 'No cumple');

  const descargarPDF = async () => {
    setGenerando(true);
    // Se espera a que el reporte se acomode al ancho de hoja carta antes de "fotografiarlo".
    await new Promise(r => setTimeout(r, 150));
    try {
      await guardarPdfUnaHoja(document.getElementById('reporte-mueble')!, `Supervision_Mueble_${a.mueble.numero}_${a.folio}.pdf`);
    } catch (e) {
      console.error(e);
      alert('No se pudo generar el PDF. Intenta de nuevo.');
    } finally {
      setGenerando(false);
    }
  };

  const compartirWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(textoWhatsApp(a))}`, '_blank');
  };

  return (
    <div className="max-w-3xl mx-auto px-2 py-4 pb-24">
      {/* Botones */}
      <div className="flex flex-wrap gap-2 items-center justify-between bg-white p-3 mb-4 rounded-2xl border border-fdn-line shadow-fdn">
        <button onClick={onClose} className="text-fdn-muted font-medium px-2 py-2">{textoCerrar}</button>
        <div className="flex gap-2">
          <button onClick={compartirWhatsApp} className="bg-green-600 text-white font-bold px-4 py-2.5 rounded-lg text-sm">WhatsApp</button>
          <button onClick={descargarPDF} disabled={generando} className="bg-fdn-red text-white font-bold px-4 py-2.5 rounded-lg text-sm disabled:opacity-60">
            {generando ? 'Generando…' : 'PDF'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          id="reporte-mueble"
          className="bg-white text-fdn-fg mx-auto p-5 rounded-2xl border border-fdn-line shadow-fdn"
          style={generando ? { width: '7.9in', borderRadius: 0, boxShadow: 'none' } : undefined}
        >
          {/* Encabezado */}
          <div className="flex justify-between items-start border-b-2 border-fdn-blue pb-3 mb-4 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/ferre-don-nico-logo.webp" alt="Ferre Don Nico" className="h-10 w-auto shrink-0" />
              <div className="min-w-0">
              <h1 className="text-lg font-black text-fdn-blue-ink leading-tight">Supervisión de mueble</h1>
              <p className="text-xs text-fdn-muted">Ferre Mina (A06) · Ferre Don Nico</p>
            </div>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-fdn-red-ink text-sm whitespace-nowrap">{a.folio}</p>
              <p className="text-xs text-fdn-muted">{fechaCorta(a.fecha)} · {a.hora}</p>
            </div>
          </div>

          {/* Datos y calificación */}
          {/* Al generar el PDF el reporte se compacta (columnas) para caber en una hoja carta. */}
          <div className={`grid gap-4 mb-5 ${generando ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
            <div className={`text-sm space-y-1 ${generando ? 'col-span-2' : 'sm:col-span-2'}`}>
              <p><span className="text-fdn-muted">Mueble:</span> <b>{a.mueble.numero}</b> · {a.mueble.ubicacion}</p>
              <p><span className="text-fdn-muted">Familias:</span> {a.mueble.familias}</p>
              <p><span className="text-fdn-muted">Titular:</span> <b>{a.mueble.titular}</b>{a.mueble.suplente ? ` · Suplente: ${a.mueble.suplente}` : ''}</p>
              <p><span className="text-fdn-muted">Atendió:</span> {a.atendio}</p>
              <p><span className="text-fdn-muted">Auditor:</span> {a.auditor}</p>
              {a.auditorEsSupervisor && (
                <p className="text-xs text-orange-700">Auditado por su supervisor(a) directo(a) (no cruzada).</p>
              )}
            </div>
            <div className="flex flex-col items-center justify-center bg-fdn-bg rounded-xl p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-fdn-muted">Calificación</p>
              <p className="text-4xl font-black leading-none my-1">{c.calificacion}</p>
              <SemaforoChip semaforo={c.semaforo} />
              <p className="text-[10px] text-fdn-muted mt-1">{c.obtenidos} de {c.posibles} pts</p>
              {a.servicioNA && <p className="text-[10px] text-fdn-muted">Sin cliente en la zona (sobre 85)</p>}
              {c.criticosFallados.length > 0 && <p className="text-[11px] text-red-700 font-bold mt-1">Falla crítica: {c.criticosFallados.join(', ')}</p>}
            </div>
          </div>

          {/* Resumen por bloque */}
          <h2 className="text-xs font-bold uppercase tracking-wide text-fdn-blue-ink mb-2">Resumen por bloque</h2>
          <div className={`mb-5 ${generando ? 'grid grid-cols-2 gap-x-6 gap-y-2' : 'space-y-2'}`}>
            {bloques.map(b => {
              const pct = b.posibles ? Math.round((b.obtenidos / b.posibles) * 100) : 0;
              return (
                <div key={b.titulo} className="text-sm">
                  <div className="flex justify-between">
                    <span>{b.titulo}</span>
                    <span className="font-semibold">{b.na ? 'N/A' : `${b.obtenidos} / ${b.posibles}`}</span>
                  </div>
                  <div className="h-2 bg-fdn-surface-2 rounded-full overflow-hidden">
                    <div className={`h-2 ${b.na ? 'bg-gray-300' : pct >= 90 ? 'bg-green-600' : pct >= 80 ? 'bg-yellow-400' : 'bg-red-700'}`} style={{ width: `${b.na ? 100 : pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detalle */}
          <h2 className="text-xs font-bold uppercase tracking-wide text-fdn-blue-ink mb-2">Detalle de los 13 puntos</h2>
          <table className="w-full text-xs mb-5">
            <tbody>
              {a.resultados.map(r => (
                <tr key={r.punto} className={`border-b border-fdn-line align-top ${generando ? '[&>td]:py-0.5' : '[&>td]:py-1.5'}`}>
                  <td className="pr-2 font-bold text-fdn-muted w-8">{r.punto}</td>
                  <td className="pr-2">
                    {r.descripcion}
                    {r.observacion && <span className="block text-fdn-muted italic">{r.observacion}</span>}
                  </td>
                  <td className={`text-right whitespace-nowrap font-semibold ${r.resultado === 'Cumple' ? 'text-green-700' : r.resultado === 'No cumple' ? 'text-red-700' : 'text-fdn-muted'}`}>
                    {r.resultado === 'Cumple' ? '✓' : r.resultado === 'No cumple' ? '✗' : ''} {r.resultado}
                  </td>
                  <td className="pl-2 text-right text-fdn-muted w-12">{r.resultado === 'N/A' ? '—' : `${r.obtenidos}/${r.posibles}`}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Plan de acción */}
          <h2 className="text-xs font-bold uppercase tracking-wide text-fdn-blue-ink mb-2">Plan de acción</h2>
          {plan.length === 0 ? (
            <p className="text-sm text-fdn-ok font-semibold mb-5">Sin puntos por corregir.</p>
          ) : (
            <div className={`mb-5 ${generando ? 'grid grid-cols-2 gap-2' : 'space-y-3'}`}>
              {plan.map(r => {
                const e = a.evidencias[r.punto];
                return (
                  <div key={r.punto} className={`flex gap-3 border border-red-200 rounded-lg ${generando ? 'p-2' : 'p-3'}`}>
                    <div className={`${generando ? 'w-20 h-20' : 'w-28 h-28'} shrink-0 bg-fdn-bg rounded-lg overflow-hidden flex items-center justify-center`}>
                      {e?.foto ? <ImagenDrive src={e.foto} alt={`Foto ${r.punto}`} className="w-full h-full object-cover" /> : <span className="text-[10px] text-fdn-muted">Sin foto</span>}
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-red-700">{r.punto} · {r.descripcion}</p>
                      {r.observacion && <p><span className="text-fdn-muted">Se encontró:</span> {r.observacion}</p>}
                      {e && (
                        <>
                          <p><span className="text-fdn-muted">Acción:</span> {e.accion}</p>
                          <p><span className="text-fdn-muted">Responsable:</span> {e.responsable}</p>
                          <p><span className="text-fdn-muted">Fecha compromiso:</span> {fechaCorta(e.fechaCompromiso)}</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Firmas */}
          <div className="grid grid-cols-2 gap-6 pt-4">
            {[
              { firma: a.firmaAuditor, nombre: a.auditor, rol: 'Auditor' },
              { firma: a.firmaVendedor, nombre: a.firmoVendedor, rol: a.firmoVendedor === a.mueble.titular ? 'Vendedor titular' : 'Vendedor (atendió)' },
            ].map(f => (
              <div key={f.rol} className="text-center">
                <div className="h-16 flex items-end justify-center border-b border-fdn-muted mb-1">
                  {f.firma && <ImagenDrive src={f.firma} alt={`Firma ${f.rol}`} className="max-h-16 max-w-full object-contain" />}
                </div>
                <p className="text-xs font-bold uppercase">{f.nombre}</p>
                <p className="text-[10px] text-fdn-muted">{f.rol}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {onOtra && (
        <button onClick={onOtra} className="w-full mt-4 bg-fdn-blue text-white font-bold py-4 rounded-xl">Auditar otro mueble</button>
      )}
    </div>
  );
};

export default ReporteMueble;
