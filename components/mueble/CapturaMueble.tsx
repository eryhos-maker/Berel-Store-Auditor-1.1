import React, { useEffect, useMemo, useState } from 'react';
import { AuditoriaMueble, CatalogosMueble } from '../../types';
import { SheetsService } from '../../services/sheetsService';
import { comprimirFoto } from '../../services/fotos';
import {
  BLOQUES, PUNTOS_MUEBLE, Resultado, EvidenciaMueble, calificar, faltantesPuntos, mismoNombre,
} from '../../services/calificacionMueble';
import SignaturePad from '../SignaturePad';
import { SemaforoChip } from './SemaforoChip';

interface Props {
  onGuardado: (a: AuditoriaMueble) => void;
  onCancel: () => void;
}

const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ETIQUETA: Record<Resultado, string> = { CUMPLE: 'Cumple', NO_CUMPLE: 'No cumple', NA: 'N/A' };

const CapturaMueble: React.FC<Props> = ({ onGuardado, onCancel }) => {
  const [cat, setCat] = useState<CatalogosMueble | null>(null);
  const [errorCarga, setErrorCarga] = useState('');

  const [id] = useState(() => crypto.randomUUID());
  const [fecha, setFecha] = useState(hoyLocal());
  const [auditor, setAuditor] = useState('');
  const [numero, setNumero] = useState('');
  const [atendio, setAtendio] = useState('');
  const [respuestas, setRespuestas] = useState<Record<string, Resultado | undefined>>({});
  const [obs, setObs] = useState<Record<string, string>>({});
  const [evid, setEvid] = useState<Record<string, EvidenciaMueble>>({});
  const [cargandoFoto, setCargandoFoto] = useState('');

  const [firmaAuditor, setFirmaAuditor] = useState('');
  const [firmaVendedor, setFirmaVendedor] = useState('');
  const [firmoVendedor, setFirmoVendedor] = useState('');
  const [firmando, setFirmando] = useState<'auditor' | 'vendedor' | null>(null);

  const [verFaltantes, setVerFaltantes] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');

  const cargar = () => {
    setErrorCarga('');
    SheetsService.getCatalogosMueble().then(setCat).catch(e => setErrorCarga((e as Error).message));
  };
  useEffect(cargar, []);

  const mueble = cat?.muebles.find(m => m.numero === numero);
  const supervisorTitular = cat?.vendedores.find(v => mismoNombre(v.nombre, mueble?.titular))?.supervisor || '';
  const auditorEsSupervisor = mismoNombre(auditor, supervisorTitular);
  const yaAuditado = numero ? cat?.auditadasSemana[numero] : undefined;
  const cal = useMemo(() => calificar(respuestas), [respuestas]);
  const servicioNA = PUNTOS_MUEBLE.filter(p => p.bloque === 'S').every(p => respuestas[p.id] === 'NA');

  // Si cambia el mueble, quien firma por omisión es el titular.
  useEffect(() => { setFirmoVendedor(mueble?.titular || ''); setFirmaVendedor(''); }, [numero]);

  const faltan = useMemo(() => {
    const conObs: Record<string, EvidenciaMueble> = {};
    PUNTOS_MUEBLE.forEach(p => { conObs[p.id] = { ...evid[p.id], observacion: obs[p.id] }; });
    return [
      !auditor && 'Elige quién audita',
      !mueble && 'Elige el mueble',
      !atendio && 'Elige quién atendió',
      ...faltantesPuntos(respuestas, conObs),
      !firmaAuditor && 'Falta la firma del auditor',
      !firmaVendedor && 'Falta la firma del vendedor',
    ].filter(Boolean) as string[];
  }, [auditor, mueble, atendio, respuestas, obs, evid, firmaAuditor, firmaVendedor]);

  const responder = (puntoId: string, bloque: string, r: Resultado) => {
    setRespuestas(prev => {
      const sig = { ...prev };
      const servicio = PUNTOS_MUEBLE.filter(p => p.bloque === 'S').map(p => p.id);
      if (r === 'NA') {
        // N/A aplica a todo el bloque Servicio (no hubo cliente en la zona).
        servicio.forEach(s => { sig[s] = 'NA'; });
      } else {
        if (bloque === 'S' && prev[puntoId] === 'NA') servicio.forEach(s => { if (sig[s] === 'NA') sig[s] = undefined; });
        sig[puntoId] = r;
      }
      return sig;
    });
  };

  const cambiarEvid = (puntoId: string, campo: keyof EvidenciaMueble, valor: string) =>
    setEvid(prev => ({ ...prev, [puntoId]: { ...prev[puntoId], [campo]: valor } }));

  const tomarFoto = async (puntoId: string, archivo?: File) => {
    if (!archivo) return;
    setCargandoFoto(puntoId);
    try {
      cambiarEvid(puntoId, 'foto', await comprimirFoto(archivo));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCargandoFoto('');
    }
  };

  const guardar = async () => {
    if (faltan.length) {
      setVerFaltantes(true);
      document.getElementById('faltantes')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (!mueble) return;
    setGuardando(true);
    setErrorGuardar('');
    const ahora = new Date();
    const auditoria: AuditoriaMueble = {
      id,
      folio: '',
      fecha,
      hora: `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`,
      mueble: { numero: mueble.numero, ubicacion: mueble.ubicacion, familias: mueble.familias, titular: mueble.titular, suplente: mueble.suplente },
      supervisorTitular,
      atendio,
      auditor,
      auditorEsSupervisor,
      servicioNA,
      resultados: PUNTOS_MUEBLE.map(p => {
        const r = respuestas[p.id]!;
        return {
          punto: p.id,
          bloque: BLOQUES.find(b => b.id === p.bloque)!.titulo,
          descripcion: p.texto,
          resultado: ETIQUETA[r] as 'Cumple' | 'No cumple' | 'N/A',
          posibles: r === 'NA' ? 0 : p.puntos,
          obtenidos: r === 'CUMPLE' ? p.puntos : 0,
          observacion: (obs[p.id] || '').trim(),
        };
      }),
      evidencias: Object.fromEntries(PUNTOS_MUEBLE.filter(p => respuestas[p.id] === 'NO_CUMPLE').map(p => {
        const e = evid[p.id];
        return [p.id, { foto: e.foto!, accion: e.accion!.trim(), responsable: e.responsable!.trim(), fechaCompromiso: e.fechaCompromiso! }];
      })),
      calificacion: {
        obtenidos: cal.obtenidos, posibles: cal.posibles, calificacion: cal.calificacion,
        semaforo: cal.semaforo, criticosFallados: cal.criticosFallados,
      },
      firmaAuditor,
      firmoVendedor,
      firmaVendedor,
    };
    try {
      onGuardado(await SheetsService.saveAuditoriaMueble(auditoria));
    } catch (e) {
      setErrorGuardar((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  if (errorCarga) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <p className="text-red-700 font-semibold mb-4">{errorCarga}</p>
        <button onClick={cargar} className="bg-blue-900 text-white font-bold py-3 px-6 rounded-xl">Reintentar</button>
      </div>
    );
  }
  if (!cat) return <p className="text-center text-gray-500 py-16 animate-pulse">Cargando muebles y vendedores…</p>;

  const otrosVendedores = cat.vendedores.filter(v => !mismoNombre(v.nombre, mueble?.titular) && !mismoNombre(v.nombre, mueble?.suplente));
  const responsables = Array.from(new Set([...cat.vendedores.map(v => v.nombre), ...cat.auditores.map(a => a.nombre)]));
  const select = 'mt-1 block w-full rounded-lg border border-gray-300 bg-white p-3 text-base';

  return (
    <div className="max-w-2xl mx-auto pb-32">
      {/* Calificación en vivo */}
      <div className="sticky top-2 z-30 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm rounded-b-lg">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Calificación</p>
          <p className="text-2xl font-black text-gray-900 leading-none">
            {cal.calificacion}<span className="text-sm font-semibold text-gray-500"> / 100</span>
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">{cal.obtenidos} de {cal.posibles} pts · {cal.contestados}/13 puntos</p>
        </div>
        <div className="text-right">
          <SemaforoChip semaforo={cal.semaforo} />
          {cal.criticosFallados.length > 0 && (
            <p className="text-[11px] text-red-700 font-semibold mt-1">⚠️ Falla crítica: {cal.criticosFallados.join(', ')}</p>
          )}
        </div>
      </div>

      {/* Datos */}
      <section className="bg-white mx-2 mt-4 p-4 rounded-xl shadow-sm space-y-4">
        <h2 className="font-bold text-blue-900">1. ¿Quién audita y qué mueble?</h2>
        <label className="block text-sm font-medium text-gray-700">Auditor
          <select className={select} value={auditor} onChange={e => setAuditor(e.target.value)}>
            <option value="">Elige…</option>
            {cat.auditores.map(a => <option key={a.nomina} value={a.nombre}>{a.nombre}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700">Fecha
          <input type="date" className={select} value={fecha} max={hoyLocal()} onChange={e => setFecha(e.target.value)} />
        </label>
        <label className="block text-sm font-medium text-gray-700">Mueble
          <select className={select} value={numero} onChange={e => { setNumero(e.target.value); setAtendio(''); }}>
            <option value="">Elige…</option>
            {cat.muebles.map(m => (
              <option key={m.numero} value={m.numero}>
                {m.numero} · {m.familias}{cat.auditadasSemana[m.numero] ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </label>

        {mueble && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm space-y-1">
            <p><span className="text-gray-500">Ubicación:</span> {mueble.ubicacion} · {mueble.tipo}</p>
            <p><span className="text-gray-500">Titular:</span> <b>{mueble.titular}</b></p>
            <p><span className="text-gray-500">Suplente:</span> {mueble.suplente || '—'}</p>
            <p><span className="text-gray-500">Le toca auditar:</span> {mueble.supervisorAudita || '—'}</p>
          </div>
        )}
        {yaAuditado && (
          <p className="rounded-lg bg-yellow-50 border border-yellow-300 p-3 text-sm text-yellow-900">
            Este mueble ya se auditó esta semana ({yaAuditado.folio}, {yaAuditado.fecha}, {yaAuditado.auditor}). Cada mueble se audita 1 vez por semana.
          </p>
        )}
        {auditor && mueble && auditorEsSupervisor && (
          <p className="rounded-lg bg-orange-50 border border-orange-300 p-3 text-sm text-orange-900">
            {auditor} es supervisor(a) directo(a) de {mueble.titular}. La auditoría debería ser cruzada; puedes continuar.
          </p>
        )}

        {mueble && (
          <label className="block text-sm font-medium text-gray-700">¿Quién atendió el mueble hoy?
            <select className={select} value={atendio} onChange={e => setAtendio(e.target.value)}>
              <option value="">Elige…</option>
              <option value={mueble.titular}>{mueble.titular} (titular)</option>
              {mueble.suplente && <option value={mueble.suplente}>{mueble.suplente} (suplente)</option>}
              {otrosVendedores.map(v => <option key={v.nomina} value={v.nombre}>{v.nombre}</option>)}
            </select>
          </label>
        )}
      </section>

      {/* Puntos */}
      {BLOQUES.map(b => {
        const res = cal.porBloque.find(x => x.id === b.id)!;
        return (
          <section key={b.id} className="bg-white mx-2 mt-4 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-blue-900 text-white px-4 py-2 flex justify-between items-center">
              <h2 className="font-bold text-sm">{b.titulo}</h2>
              <span className="text-xs">{res.na ? 'N/A' : `${res.obtenidos} / ${res.posibles} pts`}</span>
            </div>
            {b.id === 'S' && (
              <p className="px-4 pt-2 text-xs text-gray-500">Si no hubo cliente en la zona, marca N/A: se califica sobre 85.</p>
            )}
            <div className="divide-y divide-gray-100">
              {PUNTOS_MUEBLE.filter(p => p.bloque === b.id).map(p => {
                const r = respuestas[p.id];
                const e = evid[p.id] || {};
                const opciones: Resultado[] = b.id === 'S' ? ['CUMPLE', 'NO_CUMPLE', 'NA'] : ['CUMPLE', 'NO_CUMPLE'];
                return (
                  <div key={p.id} className="p-4">
                    <p className="text-sm font-semibold text-gray-900">
                      <span className="text-gray-400 mr-1">{p.id}</span>{p.texto}
                      <span className="text-gray-400 font-normal"> · {p.puntos} pts</span>
                      {p.critico && <span className="ml-2 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">CRÍTICO</span>}
                    </p>
                    <div className={`grid gap-2 mt-3 ${opciones.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      {opciones.map(o => {
                        const activo = r === o;
                        const color = o === 'CUMPLE' ? 'bg-green-600 border-green-600' : o === 'NO_CUMPLE' ? 'bg-red-600 border-red-600' : 'bg-gray-600 border-gray-600';
                        return (
                          <button
                            key={o}
                            type="button"
                            onClick={() => responder(p.id, p.bloque, o)}
                            className={`py-4 rounded-xl text-base font-bold border-2 transition ${activo ? `${color} text-white shadow` : 'bg-white border-gray-200 text-gray-600'}`}
                          >
                            {ETIQUETA[o]}
                          </button>
                        );
                      })}
                    </div>

                    {r === 'NO_CUMPLE' && (
                      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 space-y-3">
                        <p className="text-xs font-bold text-red-800">Evidencia obligatoria</p>
                        <div>
                          {e.foto ? (
                            <div className="flex items-center gap-3">
                              <img src={e.foto} alt={`Foto ${p.id}`} className="h-20 w-20 object-cover rounded-lg border" />
                              <label className="text-sm text-blue-800 underline">
                                Cambiar foto
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={ev => tomarFoto(p.id, ev.target.files?.[0])} />
                              </label>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border-2 border-dashed border-red-300 bg-white text-red-800 font-semibold">
                              {cargandoFoto === p.id ? 'Procesando foto…' : '📷 Tomar foto'}
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={ev => tomarFoto(p.id, ev.target.files?.[0])} />
                            </label>
                          )}
                        </div>
                        <textarea
                          className="block w-full rounded-lg border border-gray-300 p-2 text-sm" rows={2}
                          placeholder="¿Qué se encontró?" value={obs[p.id] || ''}
                          onChange={ev => setObs(prev => ({ ...prev, [p.id]: ev.target.value }))}
                        />
                        <textarea
                          className="block w-full rounded-lg border border-gray-300 p-2 text-sm" rows={2}
                          placeholder="Acción correctiva" value={e.accion || ''}
                          onChange={ev => cambiarEvid(p.id, 'accion', ev.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-xs text-gray-700">Responsable
                            <input
                              list="responsables-mm" className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                              value={e.responsable ?? ''} placeholder={mueble?.titular || 'Nombre'}
                              onChange={ev => cambiarEvid(p.id, 'responsable', ev.target.value)}
                            />
                          </label>
                          <label className="text-xs text-gray-700">Fecha compromiso
                            <input
                              type="date" min={fecha} className="mt-1 block w-full rounded-lg border border-gray-300 p-2 text-sm"
                              value={e.fechaCompromiso || ''} onChange={ev => cambiarEvid(p.id, 'fechaCompromiso', ev.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                    {r && r !== 'NO_CUMPLE' && (
                      <input
                        className="mt-3 block w-full rounded-lg border border-gray-200 p-2 text-sm" placeholder="Observación (opcional)"
                        value={obs[p.id] || ''} onChange={ev => setObs(prev => ({ ...prev, [p.id]: ev.target.value }))}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      <datalist id="responsables-mm">{responsables.map(n => <option key={n} value={n} />)}</datalist>

      {/* Firmas */}
      <section className="bg-white mx-2 mt-4 p-4 rounded-xl shadow-sm space-y-3">
        <h2 className="font-bold text-blue-900">Firmas</h2>
        <button
          type="button" disabled={!auditor} onClick={() => setFirmando('auditor')}
          className={`w-full py-3 rounded-xl border-2 font-semibold ${firmaAuditor ? 'border-green-600 text-green-700 bg-green-50' : 'border-blue-900 text-blue-900'} disabled:opacity-40`}
        >
          {firmaAuditor ? '✓ Firmó el auditor' : `Firma del auditor${auditor ? ` (${auditor})` : ''}`}
        </button>
        {mueble && atendio && !mismoNombre(atendio, mueble.titular) && (
          <label className="block text-sm text-gray-700">¿Quién firma por el mueble?
            <select className={select} value={firmoVendedor} onChange={e => { setFirmoVendedor(e.target.value); setFirmaVendedor(''); }}>
              <option value={mueble.titular}>{mueble.titular} (titular)</option>
              <option value={atendio}>{atendio} (atendió hoy; el titular no está)</option>
            </select>
          </label>
        )}
        <button
          type="button" disabled={!mueble} onClick={() => setFirmando('vendedor')}
          className={`w-full py-3 rounded-xl border-2 font-semibold ${firmaVendedor ? 'border-green-600 text-green-700 bg-green-50' : 'border-blue-900 text-blue-900'} disabled:opacity-40`}
        >
          {firmaVendedor ? `✓ Firmó ${firmoVendedor}` : `Firma del vendedor${firmoVendedor ? ` (${firmoVendedor})` : ''}`}
        </button>
      </section>

      {verFaltantes && faltan.length > 0 && (
        <section id="faltantes" className="mx-2 mt-4 p-4 rounded-xl bg-red-50 border border-red-300">
          <p className="font-bold text-red-800 mb-2">Para guardar falta:</p>
          <ul className="list-disc pl-5 text-sm text-red-800 space-y-0.5">{faltan.map(f => <li key={f}>{f}</li>)}</ul>
        </section>
      )}
      {errorGuardar && (
        <p className="mx-2 mt-4 p-4 rounded-xl bg-red-50 border border-red-300 text-red-800 text-sm font-semibold">
          No se guardó: {errorGuardar}
        </p>
      )}

      {/* Barra inferior */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-3 z-30">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-3 rounded-xl text-gray-600 font-semibold">Cancelar</button>
          <button
            type="button" onClick={guardar} disabled={guardando}
            className="flex-1 py-3 rounded-xl bg-red-600 text-white text-lg font-bold shadow disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : faltan.length ? `Guardar (faltan ${faltan.length})` : 'Guardar auditoría'}
          </button>
        </div>
      </div>

      {firmando && (
        <SignaturePad
          title={firmando === 'auditor' ? `Firma de ${auditor}` : `Firma de ${firmoVendedor}`}
          onSave={d => { if (firmando === 'auditor') setFirmaAuditor(d); else setFirmaVendedor(d); setFirmando(null); }}
          onCancel={() => setFirmando(null)}
        />
      )}
    </div>
  );
};

export default CapturaMueble;
