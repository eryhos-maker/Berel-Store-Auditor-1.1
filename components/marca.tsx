import React from 'react';

// Piezas del sistema de diseño Ferre Don Nico (mismos valores que la Consola de formularios).

// Íconos de línea de la Consola: 24×24, trazo redondeado, en currentColor.
const TRAZOS: Record<string, React.ReactNode> = {
  supervision: <><path d="M9 11l2 2 4-4" /><rect x="4" y="3" width="16" height="18" rx="2" /></>,
  auditoria: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.2-4.2" /></>,
  consola: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 14h3M8 17h6" /></>,
  atras: <path d="M15 18l-6-6 6-6" />,
  camara: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  palomita: <path d="M5 12l5 5 9-10" />,
  alerta: <><path d="M12 3l9.5 17h-19z" /><path d="M12 10v4M12 17.5v.01" /></>,
  descargar: <><path d="M12 4v11M7 10l5 5 5-5" /><path d="M5 20h14" /></>,
  compartir: <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" /></>,
};

export const Icono: React.FC<{ nombre: keyof typeof TRAZOS; tam?: number; grosor?: number; className?: string }> = ({ nombre, tam = 22, grosor = 2, className }) => (
  <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={grosor}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    {TRAZOS[nombre]}
  </svg>
);

/** Barra superior de cada pantalla: degradado azul de marca. */
export const BarraFDN: React.FC<{ titulo: string; subtitulo?: string; accion?: string; onAccion?: () => void }> = ({ titulo, subtitulo = 'Ferre Don Nico', accion, onAccion }) => (
  <header className="fdn-hero text-white px-4 py-3 flex items-center justify-between gap-3">
    <div className="min-w-0 leading-tight">
      <p className="font-display font-extrabold text-[17px] truncate">{titulo}</p>
      <p className="text-xs text-[#dbe7f6] font-semibold">{subtitulo}</p>
    </div>
    {accion && onAccion && (
      <button onClick={onAccion} className="text-sm font-semibold underline underline-offset-2 px-2 min-h-[44px] shrink-0">{accion}</button>
    )}
  </header>
);

/** Encabezado de sección: mayúsculas en azul con la regla roja. */
export const Seccion: React.FC<{ titulo: string }> = ({ titulo }) => (
  <div className="flex items-center gap-2.5 mt-[22px] mb-2.5">
    <h2 className="text-[12.8px] uppercase tracking-[.09em] font-extrabold text-fdn-blue-ink">{titulo}</h2>
    <span className="fdn-regla" />
  </div>
);

export const PieFDN: React.FC = () => (
  <p className="mt-9 text-center text-fdn-muted text-[12.8px]">Ferre Don Nico · Gerencia de Ferretería y Pintura</p>
);
