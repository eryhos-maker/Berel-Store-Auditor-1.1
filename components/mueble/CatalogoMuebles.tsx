import React, { useEffect, useMemo, useState } from 'react';
import { CatalogosMueble, MuebleMM } from '../../types';
import { SheetsService } from '../../services/sheetsService';
import { mismoNombre } from '../../services/calificacionMueble';

const VACIO: MuebleMM = {
  numero: '', ubicacion: '', tipo: '', familias: '', tramos: '', promocion: 'No', altoValor: 'No',
  titular: '', suplente: '', supervisorAudita: '',
};

const campo = 'mt-1 block w-full rounded-[10px] border border-fdn-campo bg-white p-3 text-base';
const etiqueta = 'block text-sm font-semibold text-fdn-fg';

// Catálogo de muebles de Ferre Mina: alta, cambios de titular, suplente y auditor, y baja.
const CatalogoMuebles: React.FC = () => {
  const [cat, setCat] = useState<CatalogosMueble | null>(null);
  const [error, setError] = useState('');
  const [buscar, setBuscar] = useState('');
  const [editando, setEditando] = useState<{ original: string; m: MuebleMM } | null>(null);
  const [borrando, setBorrando] = useState<MuebleMM | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = () => {
    setError('');
    SheetsService.getCatalogosMueble().then(setCat).catch(e => setError((e as Error).message));
  };
  useEffect(cargar, []);

  const supervisorDe = (nombre: string) => cat?.vendedores.find(v => mismoNombre(v.nombre, nombre))?.supervisor || '';

  const lista = useMemo(() => {
    const t = buscar.trim().toLowerCase();
    return (cat?.muebles || []).filter(m => !t || [m.numero, m.familias, m.titular, m.suplente, m.supervisorAudita, m.ubicacion]
      .some(x => String(x || '').toLowerCase().includes(t)));
  }, [cat, buscar]);

  const porAuditor = useMemo(() => (cat?.auditores || []).map(a => ({
    nombre: a.nombre,
    n: (cat?.muebles || []).filter(m => mismoNombre(m.supervisorAudita, a.nombre)).length,
  })), [cat]);

  const guardar = async () => {
    if (!editando) return;
    const m = editando.m;
    const falta = [!m.numero.trim() && 'número', !m.familias.trim() && 'familias', !m.titular && 'titular', !m.supervisorAudita && 'quién audita'].filter(Boolean);
    if (falta.length) { setErrorForm(`Falta: ${falta.join(', ')}.`); return; }
    if (m.suplente && mismoNombre(m.suplente, m.titular)) { setErrorForm('El suplente no puede ser el mismo titular.'); return; }
    setGuardando(true);
    setErrorForm('');
    try {
      await SheetsService.guardarMueble({ ...m, numero: m.numero.trim() }, editando.original);
      setAviso(editando.original ? `Se guardaron los cambios de ${m.numero}.` : `Se agregó el mueble ${m.numero}.`);
      setEditando(null);
      cargar();
    } catch (e) {
      setErrorForm((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async () => {
    if (!borrando) return;
    setGuardando(true);
    try {
      await SheetsService.borrarMueble(borrando.numero);
      setAviso(`Se eliminó el mueble ${borrando.numero}.`);
      setBorrando(null);
      cargar();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  if (error) {
    return (
      <div className="bg-white p-6 text-center rounded-2xl border border-fdn-line shadow-fdn">
        <p className="text-fdn-error font-semibold mb-3">{error}</p>
        <button onClick={cargar} className="min-h-[44px] px-4 rounded-xl bg-fdn-red text-white font-extrabold">Reintentar</button>
      </div>
    );
  }
  if (!cat) return <p className="text-center text-fdn-muted py-10 animate-pulse">Cargando muebles…</p>;

  const m = editando?.m;
  const cambiar = (k: keyof MuebleMM, v: string) => setEditando(e => (e ? { ...e, m: { ...e.m, [k]: v } } : e));
  const supTitular = m ? supervisorDe(m.titular) : '';

  return (
    <div className="space-y-4">
      <section className="bg-white p-4 rounded-2xl border border-fdn-line shadow-fdn">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
          <div>
            <h3 className="text-[12.8px] uppercase tracking-[.09em] font-extrabold text-fdn-blue-ink">Muebles de Ferre Mina ({cat.muebles.length})</h3>
            <p className="text-xs text-fdn-muted mt-1">
              {porAuditor.map(a => `${a.nombre}: ${a.n}`).join(' · ')}
            </p>
          </div>
          <button
            onClick={() => { setErrorForm(''); setEditando({ original: '', m: { ...VACIO } }); }}
            className="min-h-[44px] px-4 rounded-xl bg-fdn-red hover:bg-fdn-red-ink text-white font-extrabold"
          >
            Agregar mueble
          </button>
        </div>
        <input
          className={campo} placeholder="Buscar por número, familia, titular o auditor"
          value={buscar} onChange={e => setBuscar(e.target.value)}
        />
        {aviso && <p className="mt-3 text-sm font-semibold text-fdn-ok bg-fdn-ok-bg rounded-[10px] p-3">{aviso}</p>}
      </section>

      <div className="grid gap-3 grid-cols-1 min-[720px]:grid-cols-2">
        {lista.map(x => {
          const noCruzada = mismoNombre(x.supervisorAudita, supervisorDe(x.titular));
          return (
            <article key={x.numero} className="bg-white p-3.5 rounded-2xl border border-fdn-line shadow-fdn grid gap-2 min-w-0">
              <div className="flex justify-between gap-2 items-start">
                <div className="min-w-0">
                  <h4 className="text-[16.8px] font-extrabold leading-tight">{x.numero}</h4>
                  <p className="text-sm text-fdn-muted truncate">{x.familias}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {[x.ubicacion, x.tipo].filter(Boolean).map(t => (
                    <span key={t} className="text-[11.8px] font-bold px-2 py-0.5 rounded-md bg-fdn-surface-2 text-fdn-muted whitespace-nowrap">{t}</span>
                  ))}
                </div>
              </div>
              <p className="text-[13.6px] text-fdn-muted">Titular: <b className="text-fdn-fg">{x.titular || '—'}</b></p>
              <p className="text-[13.6px] text-fdn-muted">Suplente: <b className="text-fdn-fg">{x.suplente || '—'}</b></p>
              <p className="text-[13.6px] text-fdn-muted">
                Audita: <b className="text-fdn-fg">{x.supervisorAudita || '—'}</b>
                {noCruzada && <span className="ml-1.5 text-[11.8px] font-extrabold px-1.5 py-0.5 rounded-md bg-fdn-warn-bg text-fdn-warn">No cruzada</span>}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setErrorForm(''); setAviso(''); setEditando({ original: x.numero, m: { ...VACIO, ...x } }); }}
                  className="flex-1 min-h-[44px] rounded-xl bg-fdn-surface-2 border-[1.5px] border-transparent hover:border-fdn-line font-extrabold"
                >
                  Editar
                </button>
                <button onClick={() => { setAviso(''); setBorrando(x); }} className="min-h-[44px] px-4 rounded-xl text-fdn-error font-bold">
                  Eliminar
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {lista.length === 0 && <p className="text-center text-fdn-muted py-6">No hay muebles con esa búsqueda.</p>}

      {/* Formulario de alta / cambio */}
      {m && (
        <div className="fixed inset-0 z-50 bg-[rgba(22,33,58,.6)] flex items-end min-[700px]:items-center justify-center">
          <div className="bg-white w-full max-w-[640px] max-h-[92vh] overflow-auto rounded-t-2xl min-[700px]:rounded-2xl p-4 space-y-3">
            <h3 className="text-xl font-extrabold">{editando!.original ? `Editar ${editando!.original}` : 'Agregar mueble'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className={etiqueta}>Número *<input className={campo} value={m.numero} onChange={e => cambiar('numero', e.target.value.toUpperCase())} placeholder="M-15A" /></label>
              <label className={etiqueta}>Tipo<input className={campo} value={m.tipo} onChange={e => cambiar('tipo', e.target.value)} placeholder="Góndola" /></label>
            </div>
            <label className={etiqueta}>Familias / productos *<input className={campo} value={m.familias} onChange={e => cambiar('familias', e.target.value)} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className={etiqueta}>Ubicación<input className={campo} value={m.ubicacion} onChange={e => cambiar('ubicacion', e.target.value)} placeholder="Lateral" /></label>
              <label className={etiqueta}>Tramos o metros<input className={campo} value={m.tramos} onChange={e => cambiar('tramos', e.target.value)} /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className={etiqueta}>¿Promoción?
                <select className={campo} value={m.promocion || 'No'} onChange={e => cambiar('promocion', e.target.value)}><option>No</option><option>Sí</option></select>
              </label>
              <label className={etiqueta}>¿Alto valor?
                <select className={campo} value={m.altoValor || 'No'} onChange={e => cambiar('altoValor', e.target.value)}><option>No</option><option>Sí</option></select>
              </label>
            </div>
            <label className={etiqueta}>Titular (dueño del mueble) *
              <select className={campo} value={m.titular} onChange={e => cambiar('titular', e.target.value)}>
                <option value="">Elige…</option>
                {cat.vendedores.map(v => <option key={v.nomina} value={v.nombre}>{v.nombre} ({v.supervisor})</option>)}
              </select>
            </label>
            <label className={etiqueta}>Suplente (cuando descansa el titular)
              <select className={campo} value={m.suplente} onChange={e => cambiar('suplente', e.target.value)}>
                <option value="">Sin suplente</option>
                {cat.vendedores.filter(v => !mismoNombre(v.nombre, m.titular)).map(v => <option key={v.nomina} value={v.nombre}>{v.nombre}</option>)}
              </select>
            </label>
            <label className={etiqueta}>Quién lo audita *
              <select className={campo} value={m.supervisorAudita} onChange={e => cambiar('supervisorAudita', e.target.value)}>
                <option value="">Elige…</option>
                {cat.auditores.map(a => <option key={a.nomina} value={a.nombre}>{a.nombre}</option>)}
              </select>
            </label>
            {supTitular && (
              <p className={`text-sm rounded-[10px] p-3 ${mismoNombre(m.supervisorAudita, supTitular) ? 'bg-fdn-warn-bg text-fdn-warn font-semibold' : 'bg-fdn-blue-bg text-fdn-blue'}`}>
                {mismoNombre(m.supervisorAudita, supTitular)
                  ? `${supTitular} es supervisor(a) directo(a) de ${m.titular}: la auditoría no sería cruzada.`
                  : `${m.titular} es del equipo de ${supTitular}; lo audita alguien de otro equipo.`}
              </p>
            )}
            {errorForm && <p className="text-sm font-semibold text-fdn-error bg-fdn-error-bg rounded-[10px] p-3">{errorForm}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditando(null)} className="min-h-[48px] px-4 rounded-xl bg-fdn-surface-2 font-extrabold">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="flex-1 min-h-[48px] rounded-xl bg-fdn-red hover:bg-fdn-red-ink text-white font-extrabold disabled:opacity-60">
                {guardando ? 'Guardando…' : 'Guardar mueble'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar baja */}
      {borrando && (
        <div className="fixed inset-0 z-50 bg-[rgba(22,33,58,.6)] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-3">
            <h3 className="text-lg font-extrabold">¿Eliminar el mueble {borrando.numero}?</h3>
            <p className="text-sm text-fdn-muted">Deja de aparecer para auditar. Las auditorías que ya tiene se conservan en el historial.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setBorrando(null)} className="min-h-[44px] px-4 rounded-xl bg-fdn-surface-2 font-extrabold">Cancelar</button>
              <button onClick={borrar} disabled={guardando} className="min-h-[44px] px-4 rounded-xl bg-fdn-error text-white font-extrabold disabled:opacity-60">
                {guardando ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogoMuebles;
