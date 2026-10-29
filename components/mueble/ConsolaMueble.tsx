import React, { useEffect, useMemo, useState } from 'react';
import { AuditoriaMueble, CatalogosMueble } from '../../types';
import { SheetsService } from '../../services/sheetsService';
import { lunesDeSemana, mismoNombre, semaforoDe } from '../../services/calificacionMueble';
import { SemaforoChip } from './SemaforoChip';
import ReporteMueble from './ReporteMueble';

const fechaCorta = (f: string) => {
  const [a, m, d] = (f || '').split('-');
  return a && m && d ? `${d}/${m}/${a}` : f;
};

const sumarDias = (fecha: string, dias: number) => {
  const [a, m, d] = fecha.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
};

const nombreSemana = (lunes: string) => `Semana del ${fechaCorta(lunes).slice(0, 5)} al ${fechaCorta(sumarDias(lunes, 6))}`;

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const nombreMes = (mes: string) => {
  const [a, m] = mes.split('-');
  return `${MESES[Number(m) - 1] || m} ${a}`;
};

function descargarCSV(nombre: string, encabezados: string[], filas: (string | number)[][]) {
  const celda = (v: string | number) => {
    const t = v === undefined || v === null ? '' : String(v);
    return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const texto = '﻿' + [encabezados, ...filas].map(f => f.map(celda).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const PUNTOS = ['L1', 'L2', 'L3', 'L4', 'P1', 'P2', 'P3', 'E1', 'E2', 'E3', 'S1', 'S2', 'S3'];

const ConsolaMueble: React.FC = () => {
  const [auditorias, setAuditorias] = useState<AuditoriaMueble[] | null>(null);
  const [cat, setCat] = useState<CatalogosMueble | null>(null);
  const [error, setError] = useState('');
  const [abierta, setAbierta] = useState<AuditoriaMueble | null>(null);

  const [semana, setSemana] = useState('');
  const [mueble, setMueble] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [auditor, setAuditor] = useState('');
  const [mes, setMes] = useState('');

  const cargar = () => {
    setError('');
    setAuditorias(null);
    Promise.all([SheetsService.getAuditoriasMueble(), SheetsService.getCatalogosMueble()])
      .then(([a, c]) => {
        setAuditorias(a);
        setCat(c);
        // Solo la primera vez: al "Actualizar" se respetan los filtros elegidos (incluido "Todas").
        if (!cat) {
          setSemana(c.semana);
          setMes(c.hoy.slice(0, 7));
        }
      })
      .catch(e => setError((e as Error).message));
  };
  useEffect(cargar, []);

  const semanaDe = (a: AuditoriaMueble) => a.semana || lunesDeSemana(a.fecha);
  const mesDe = (a: AuditoriaMueble) => a.mes || a.fecha.slice(0, 7);

  const semanas = useMemo(() => {
    const s = new Set((auditorias || []).map(semanaDe));
    if (cat) s.add(cat.semana);
    return Array.from(s).sort().reverse();
  }, [auditorias, cat]);
  const meses = useMemo(() => {
    const s = new Set((auditorias || []).map(mesDe));
    if (cat) s.add(cat.hoy.slice(0, 7));
    return Array.from(s).sort().reverse();
  }, [auditorias, cat]);

  const filtradas = useMemo(() => (auditorias || []).filter(a =>
    (!semana || semanaDe(a) === semana) &&
    (!mueble || a.mueble.numero === mueble) &&
    (!vendedor || mismoNombre(a.mueble.titular, vendedor) || mismoNombre(a.atendio, vendedor)) &&
    (!auditor || mismoNombre(a.auditor, auditor)),
  ), [auditorias, semana, mueble, vendedor, auditor]);

  // Auditados vs pendientes de la semana elegida (o la actual).
  const semanaAvance = semana || cat?.semana || '';
  const avance = useMemo(() => {
    const hechas: Record<string, AuditoriaMueble> = {};
    (auditorias || []).filter(a => semanaDe(a) === semanaAvance).forEach(a => {
      if (!hechas[a.mueble.numero]) hechas[a.mueble.numero] = a; // la lista viene de la más reciente a la más vieja
    });
    return (cat?.muebles || []).map(m => ({ mueble: m, auditoria: hechas[m.numero] }));
  }, [auditorias, cat, semanaAvance]);
  const auditados = avance.filter(x => x.auditoria).length;

  // Promedio mensual por vendedor titular (la calificación del mueble se carga al titular).
  const promedios = useMemo(() => {
    const delMes = (auditorias || []).filter(a => mesDe(a) === mes);
    const nombres = new Set<string>((cat?.vendedores || []).map(v => v.nombre));
    delMes.forEach(a => nombres.add(a.mueble.titular));
    return Array.from(nombres).map(nombre => {
      const suyas = delMes.filter(a => mismoNombre(a.mueble.titular, nombre));
      const promedio = suyas.length ? Math.round((suyas.reduce((s, a) => s + a.calificacion.calificacion, 0) / suyas.length) * 10) / 10 : null;
      const v = cat?.vendedores.find(x => mismoNombre(x.nombre, nombre));
      return {
        nombre,
        supervisor: v?.supervisor || '',
        auditorias: suyas.length,
        promedio,
        tarjeta: promedio === null ? null : Math.round(promedio * 5) / 10, // 50 pts de la tarjeta mensual
        rojos: suyas.filter(a => a.calificacion.semaforo === 'ROJO').length,
      };
    }).sort((a, b) => (b.promedio ?? -1) - (a.promedio ?? -1) || a.nombre.localeCompare(b.nombre));
  }, [auditorias, cat, mes]);

  const exportarHistorial = () => descargarCSV(
    `Supervision_Mueble_${semana || 'todas'}.csv`,
    ['Folio', 'Fecha', 'Hora', 'Semana', 'Mueble', 'Familias', 'Titular', 'Suplente', 'Atendió', 'Auditor',
      'Auditor es supervisor directo', 'Servicio N/A', 'Puntos obtenidos', 'Puntos posibles', 'Calificación', 'Semáforo',
      'Críticos fallados', ...PUNTOS, 'Plan de acción'],
    filtradas.map(a => {
      const res = Object.fromEntries(a.resultados.map(r => [r.punto, r.resultado]));
      const plan = a.resultados.filter(r => r.resultado === 'No cumple').map(r => {
        const e = a.evidencias[r.punto];
        return `${r.punto}: ${e?.accion || ''} (${e?.responsable || ''}, ${e?.fechaCompromiso || ''})`;
      }).join(' | ');
      return [a.folio, a.fecha, a.hora, semanaDe(a), a.mueble.numero, a.mueble.familias, a.mueble.titular, a.mueble.suplente,
        a.atendio, a.auditor, a.auditorEsSupervisor ? 'Sí' : 'No', a.servicioNA ? 'Sí' : 'No', a.calificacion.obtenidos,
        a.calificacion.posibles, a.calificacion.calificacion, a.calificacion.semaforo, a.calificacion.criticosFallados.join(', '),
        ...PUNTOS.map(p => res[p] || ''), plan];
    }),
  );

  const exportarPromedios = () => descargarCSV(
    `Promedio_Mueble_${mes}.csv`,
    ['Mes', 'Vendedor (titular)', 'Supervisor', 'Auditorías', 'Promedio', 'Puntos tarjeta (de 50)', 'Auditorías en rojo'],
    promedios.map(p => [mes, p.nombre, p.supervisor, p.auditorias, p.promedio ?? '', p.tarjeta ?? '', p.rojos]),
  );

  if (abierta) return <ReporteMueble auditoria={abierta} onClose={() => setAbierta(null)} textoCerrar="Volver a la consola" />;
  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center">
        <p className="text-red-700 font-semibold mb-3">{error}</p>
        <button onClick={cargar} className="bg-blue-900 text-white px-4 py-2 rounded">Reintentar</button>
      </div>
    );
  }
  if (!auditorias || !cat) return <p className="text-center text-gray-500 py-10 animate-pulse">Cargando supervisiones de mueble…</p>;

  const campo = 'block w-full rounded-md border border-gray-300 p-2 text-sm bg-gray-50';
  const titulo = 'text-sm font-bold text-blue-900 uppercase tracking-wide';

  return (
    <div className="space-y-6">
      {/* Avance de la semana */}
      <section className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <h3 className={titulo}>Avance · {nombreSemana(semanaAvance)}</h3>
          <span className="text-sm font-semibold text-gray-700">{auditados} de {avance.length} muebles auditados</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
          <div className="h-2 bg-green-600" style={{ width: `${avance.length ? (auditados / avance.length) * 100 : 0}%` }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {avance.map(({ mueble: m, auditoria: a }) => (
            <button
              key={m.numero}
              type="button"
              disabled={!a}
              onClick={() => a && setAbierta(a)}
              className={`text-left rounded-lg border p-2 text-xs ${a ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}
            >
              <p className="font-bold text-gray-900">{m.numero} {a ? '✓' : ''}</p>
              <p className="text-gray-600 truncate">{m.titular}</p>
              <p className={a ? 'text-green-800' : 'text-orange-800 font-semibold'}>
                {a ? `${a.calificacion.calificacion} · ${a.auditor}` : `Pendiente · audita ${m.supervisorAudita || '—'}`}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Historial */}
      <section className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <h3 className={titulo}>Historial ({filtradas.length})</h3>
          <div className="flex gap-2">
            <button onClick={cargar} className="text-sm border border-gray-300 px-3 py-1.5 rounded">Actualizar</button>
            <button onClick={exportarHistorial} className="text-sm bg-blue-900 text-white px-3 py-1.5 rounded">Exportar CSV</button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <label className="text-xs text-gray-700">Semana
            <select className={campo} value={semana} onChange={e => setSemana(e.target.value)}>
              <option value="">Todas</option>
              {semanas.map(s => <option key={s} value={s}>{nombreSemana(s)}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-700">Mueble
            <select className={campo} value={mueble} onChange={e => setMueble(e.target.value)}>
              <option value="">Todos</option>
              {cat.muebles.map(m => <option key={m.numero} value={m.numero}>{m.numero}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-700">Vendedor
            <select className={campo} value={vendedor} onChange={e => setVendedor(e.target.value)}>
              <option value="">Todos</option>
              {cat.vendedores.map(v => <option key={v.nomina} value={v.nombre}>{v.nombre}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-700">Auditor
            <select className={campo} value={auditor} onChange={e => setAuditor(e.target.value)}>
              <option value="">Todos</option>
              {cat.auditores.map(a => <option key={a.nomina} value={a.nombre}>{a.nombre}</option>)}
            </select>
          </label>
        </div>
        {filtradas.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">No hay supervisiones con esos filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b">
                  <th className="py-2 pr-3">Folio</th><th className="py-2 pr-3">Fecha</th><th className="py-2 pr-3">Mueble</th>
                  <th className="py-2 pr-3">Titular</th><th className="py-2 pr-3">Atendió</th><th className="py-2 pr-3">Auditor</th>
                  <th className="py-2 pr-3 text-right">Calif.</th><th className="py-2 pr-3">Semáforo</th><th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {filtradas.map(a => (
                  <tr key={a.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3 font-mono text-xs text-red-600 font-bold whitespace-nowrap">{a.folio}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{fechaCorta(a.fecha)}</td>
                    <td className="py-2 pr-3 font-semibold">{a.mueble.numero}</td>
                    <td className="py-2 pr-3">{a.mueble.titular}</td>
                    <td className="py-2 pr-3">{a.atendio}</td>
                    <td className="py-2 pr-3">{a.auditor}{a.auditorEsSupervisor ? ' ⚠️' : ''}</td>
                    <td className="py-2 pr-3 text-right font-bold">{a.calificacion.calificacion}</td>
                    <td className="py-2 pr-3"><SemaforoChip semaforo={a.calificacion.semaforo} /></td>
                    <td className="py-2"><button onClick={() => setAbierta(a)} className="text-blue-800 font-semibold">Ver</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-gray-500 mt-2">⚠️ = la auditó el supervisor directo del titular (no cruzada).</p>
          </div>
        )}
      </section>

      {/* Promedio mensual */}
      <section className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-wrap justify-between items-end gap-2 mb-3">
          <div>
            <h3 className={titulo}>Promedio mensual por vendedor</h3>
            <p className="text-xs text-gray-500">La calificación de cada mueble se carga a su titular. Puntos tarjeta = promedio × 0.5 (de 50).</p>
          </div>
          <div className="flex gap-2 items-end">
            <select className={campo} value={mes} onChange={e => setMes(e.target.value)}>
              {meses.map(m => <option key={m} value={m}>{nombreMes(m)}</option>)}
            </select>
            <button onClick={exportarPromedios} className="text-sm bg-blue-900 text-white px-3 py-2 rounded whitespace-nowrap">Exportar CSV</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b">
                <th className="py-2 pr-3">Vendedor</th><th className="py-2 pr-3">Supervisor</th><th className="py-2 pr-3 text-right">Auditorías</th>
                <th className="py-2 pr-3 text-right">Promedio</th><th className="py-2 pr-3">Semáforo</th><th className="py-2 text-right">Pts tarjeta</th>
              </tr>
            </thead>
            <tbody>
              {promedios.map(p => (
                <tr key={p.nombre} className="border-b border-gray-100">
                  <td className="py-2 pr-3">{p.nombre}</td>
                  <td className="py-2 pr-3 text-gray-600">{p.supervisor}</td>
                  <td className="py-2 pr-3 text-right">{p.auditorias}</td>
                  <td className="py-2 pr-3 text-right font-bold">{p.promedio ?? '—'}</td>
                  <td className="py-2 pr-3">{p.promedio !== null ? <SemaforoChip semaforo={semaforoDe(p.promedio, false)} /> : <span className="text-xs text-gray-400">Sin auditorías</span>}</td>
                  <td className="py-2 text-right font-semibold">{p.tarjeta ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ConsolaMueble;
