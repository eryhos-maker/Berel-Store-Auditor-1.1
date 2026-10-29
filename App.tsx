import React, { useState, Suspense, lazy } from 'react';
import { AuditRecord, AuditoriaMueble } from './types';
import { SheetsService } from './services/sheetsService';
import { BarraFDN, Icono, PieFDN, Seccion } from './components/marca';

// Lazy Load components to reduce initial bundle size on mobile
const AuditForm = lazy(() => import('./components/AuditForm'));
const ReportView = lazy(() => import('./components/ReportView'));
const AdminConsole = lazy(() => import('./components/AdminConsole'));
const CapturaMueble = lazy(() => import('./components/mueble/CapturaMueble'));
const ReporteMueble = lazy(() => import('./components/mueble/ReporteMueble'));

type ViewState = 'HOME' | 'AUDIT' | 'REPORT' | 'ADMIN' | 'MUEBLE' | 'MUEBLE_OK';

// Internal Loading Component for Suspense
const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] w-full p-4">
    <div className="w-12 h-12 border-4 border-fdn-line border-t-fdn-red rounded-full animate-spin mb-4"></div>
    <p className="text-fdn-muted font-medium text-sm animate-pulse">Cargando módulo...</p>
  </div>
);

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('HOME');
  const [currentAudit, setCurrentAudit] = useState<AuditRecord | null>(null);
  const [previousView, setPreviousView] = useState<ViewState>('HOME');
  const [muebleGuardado, setMuebleGuardado] = useState<AuditoriaMueble | null>(null);
  // Cambia para que cada captura de mueble empiece en blanco.
  const [capturaMueble, setCapturaMueble] = useState(0);

  const iniciarMueble = () => {
    setCapturaMueble(n => n + 1);
    setView('MUEBLE');
  };

  const startAudit = () => {
    setView('AUDIT');
  };

  const handleFinishAudit = async (audit: AuditRecord) => {
    try {
      // Guardamos y obtenemos el registro actualizado (con ID real de DB)
      const savedAudit = await SheetsService.saveAudit(audit);
      setCurrentAudit(savedAudit);
      setPreviousView('HOME');
      setView('REPORT');
    } catch (e) {
      console.error("Error en flujo de guardado:", e);
      // En caso de error crítico, mantenemos el audit local para que no pierda datos
      setCurrentAudit(audit);
    }
  };

  const handleOpenAdmin = () => {
    setView('ADMIN');
  };

  const handleViewAuditFromAdmin = (audit: AuditRecord) => {
    setCurrentAudit(audit);
    setPreviousView('ADMIN');
    setView('REPORT');
  };

  return (
    <div className="min-h-screen font-sans text-fdn-fg flex flex-col">
      {view === 'HOME' && (
        <main className="w-full max-w-[880px] mx-auto px-4 pb-12 animate-fade-in">
          <section className="fdn-hero relative mt-4 rounded-[20px] overflow-hidden text-white px-[18px] pt-[18px] pb-5 grid grid-cols-[1fr_auto] gap-2 items-end shadow-fdn">
            <span className="absolute -right-10 -bottom-[60px] w-[220px] h-[220px] rounded-full bg-white/[.08] pointer-events-none" />
            <div className="relative z-10 grid gap-2.5 min-w-0">
              <div className="bg-white rounded-[14px] px-3 py-2 w-max max-w-full">
                <img src="/ferre-don-nico-logo.webp" alt="Ferre Don Nico" className="block w-[180px] max-w-full h-auto" />
              </div>
              <h1 className="text-[clamp(1.5rem,5.2vw,2.1rem)] font-black tracking-[-.01em] leading-[1.08]">Auditorías de Ferretería</h1>
              <p className="text-[15.2px] text-white/[.88] max-w-[40ch]">Auditorías operativas y de estándar de mercadería en piso de venta.</p>
            </div>
            <img src="/don-nico.webp" alt="" className="relative z-10 w-[clamp(92px,24vw,150px)] h-auto self-end -mb-6 drop-shadow-[0_6px_10px_rgba(0,0,0,.2)]" />
          </section>

          <Seccion titulo="Auditorías" />
          <div className="grid gap-3 grid-cols-1 min-[720px]:grid-cols-2">
            {[
              {
                titulo: 'Supervisión de mueble', icono: 'supervision' as const, azul: false, accion: 'Iniciar supervisión', onClick: iniciarMueble,
                desc: 'Limpieza, precio, existencia y servicio de cada mueble. 13 puntos, una vez por semana.',
                etiquetas: ['Ferre Mina', 'Semanal'], quien: 'Supervisores (auditoría cruzada)',
              },
              {
                titulo: 'Auditoría de tienda Berel', icono: 'auditoria' as const, azul: true, accion: 'Iniciar auditoría', onClick: startAudit,
                desc: 'Imagen, piso de venta, maquinaria y atención en las tiendas Berel.',
                etiquetas: ['Tiendas Berel'], quien: 'Coordinación Berel o Gerencia',
              },
            ].map(t => (
              <article key={t.titulo} className="bg-fdn-surface border border-fdn-line rounded-2xl p-3.5 grid gap-2.5 shadow-fdn min-w-0">
                <div className="flex gap-3 items-start">
                  <span className={`flex-none w-[42px] h-[42px] rounded-xl grid place-items-center text-white ${t.azul ? 'bg-fdn-blue' : 'bg-fdn-red'}`}>
                    <Icono nombre={t.icono} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[16.8px] font-extrabold leading-tight">{t.titulo}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {t.etiquetas.map(e => <span key={e} className="text-[11.8px] font-bold px-2 py-0.5 rounded-md bg-fdn-surface-2 text-fdn-muted">{e}</span>)}
                    </div>
                  </div>
                </div>
                <p className="text-[14.7px] text-fdn-muted">{t.desc}</p>
                <p className="text-[13.6px] text-fdn-muted">Lo llena: <b className="text-fdn-fg">{t.quien}</b></p>
                <button onClick={t.onClick} className="min-h-[44px] rounded-xl bg-fdn-red hover:bg-fdn-red-ink text-white font-extrabold text-[15.2px] px-4">
                  {t.accion}
                </button>
              </article>
            ))}
          </div>

          <Seccion titulo="Administración" />
          <article className="bg-fdn-surface border border-fdn-line rounded-2xl p-3.5 shadow-fdn flex flex-wrap gap-3 items-center">
            <span className="flex-none w-[42px] h-[42px] rounded-xl grid place-items-center text-white bg-fdn-blue"><Icono nombre="consola" /></span>
            <div className="flex-1 min-w-[180px]">
              <h3 className="text-[16.8px] font-extrabold leading-tight">Consola administrativa</h3>
              <p className="text-[14.7px] text-fdn-muted">Historial, reportes, avance de la semana, promedios y catálogos.</p>
            </div>
            <button onClick={handleOpenAdmin} className="min-h-[44px] rounded-xl bg-fdn-surface-2 border-[1.5px] border-transparent hover:border-fdn-line text-fdn-fg font-extrabold text-[15.2px] px-4">
              Abrir consola
            </button>
          </article>

          <PieFDN />
        </main>
      )}

      {/* Main Content Area with Suspense for Lazy Loading */}
      <Suspense fallback={<LoadingSpinner />}>
        {view === 'AUDIT' && (
          <div className="min-h-screen w-full animate-fade-in-up">
             <BarraFDN titulo="Auditoría de tienda Berel" accion="Cancelar" onAccion={() => setView('HOME')} />
             <div className="p-2 md:p-4">
              <AuditForm 
                onFinish={handleFinishAudit} 
                onCancel={() => setView('HOME')} 
              />
             </div>
          </div>
        )}

        {view === 'MUEBLE' && (
          <div className="min-h-screen w-full animate-fade-in-up">
            <BarraFDN titulo="Supervisión de mueble" subtitulo="Ferre Mina · Ferre Don Nico" accion="Cancelar" onAccion={() => setView('HOME')} />
            <CapturaMueble
              key={capturaMueble}
              onGuardado={a => { setMuebleGuardado(a); setView('MUEBLE_OK'); }}
              onCancel={() => setView('HOME')}
            />
          </div>
        )}

        {view === 'MUEBLE_OK' && muebleGuardado && (
          <div className="min-h-screen w-full animate-fade-in">
            <BarraFDN titulo="Supervisión de mueble" subtitulo="Ferre Mina · Ferre Don Nico" />
            <div className="bg-fdn-ok-bg text-fdn-ok text-center text-sm font-bold py-2.5 flex items-center justify-center gap-2">
              <Icono nombre="palomita" tam={18} grosor={2.6} /> Supervisión guardada · {muebleGuardado.folio}
            </div>
            <ReporteMueble auditoria={muebleGuardado} onClose={() => setView('HOME')} textoCerrar="Inicio" onOtra={iniciarMueble} />
          </div>
        )}

        {view === 'REPORT' && currentAudit && (
          <div className="animate-fade-in">
            <ReportView 
              audit={currentAudit} 
              onClose={() => setView(previousView)} 
            />
          </div>
        )}

        {view === 'ADMIN' && (
          <div className="animate-fade-in">
            <AdminConsole 
              onBack={() => setView('HOME')} 
              onViewAudit={handleViewAuditFromAdmin} 
            />
          </div>
        )}
      </Suspense>
    </div>
  );
};

export default App;