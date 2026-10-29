import React from 'react';
import { AuditoriaMueble } from '../../types';
import { SemaforoChip } from './SemaforoChip';

interface Props {
  auditoria: AuditoriaMueble;
  onOtra: () => void;
  onInicio: () => void;
}

// Confirmación al guardar. El reporte completo (fotos, plan de acción, WhatsApp y PDF) llega en la Fase 4.
const MuebleGuardado: React.FC<Props> = ({ auditoria: a, onOtra, onInicio }) => {
  const c = a.calificacion;
  const noCumple = a.resultados.filter(r => r.resultado === 'No cumple');
  return (
    <div className="max-w-md mx-auto px-4 py-8 text-center">
      <p className="text-5xl mb-2">✅</p>
      <h1 className="text-xl font-bold text-gray-900">Auditoría guardada</h1>
      <p className="font-mono text-red-600 font-bold text-lg mt-1">{a.folio}</p>
      <div className="bg-white rounded-xl shadow-sm p-5 mt-6 space-y-3">
        <p className="text-sm text-gray-500">Mueble {a.mueble.numero} · {a.mueble.titular}</p>
        <p className="text-4xl font-black text-gray-900">{c.calificacion}<span className="text-base text-gray-500"> / 100</span></p>
        <SemaforoChip semaforo={c.semaforo} grande />
        {a.servicioNA && <p className="text-xs text-gray-500">Servicio en N/A: calificado sobre 85 pts.</p>}
        {c.criticosFallados.length > 0 && <p className="text-sm text-red-700 font-semibold">Falla crítica: {c.criticosFallados.join(', ')}</p>}
        {noCumple.length > 0 && (
          <div className="text-left text-sm border-t pt-3">
            <p className="font-semibold text-gray-700 mb-1">Puntos a corregir</p>
            <ul className="space-y-1">
              {noCumple.map(r => (
                <li key={r.punto}>
                  <b>{r.punto}</b> {r.descripcion} → {a.evidencias[r.punto]?.accion} ({a.evidencias[r.punto]?.responsable}, {a.evidencias[r.punto]?.fechaCompromiso})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="mt-6 space-y-3">
        <button onClick={onOtra} className="w-full bg-red-600 text-white font-bold py-4 rounded-xl">Auditar otro mueble</button>
        <button onClick={onInicio} className="w-full border-2 border-blue-900 text-blue-900 font-semibold py-3 rounded-xl">Ir al inicio</button>
      </div>
    </div>
  );
};

export default MuebleGuardado;
