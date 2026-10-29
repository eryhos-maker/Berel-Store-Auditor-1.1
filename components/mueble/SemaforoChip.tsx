import React from 'react';

const ESTILO: Record<string, { clase: string; texto: string }> = {
  VERDE: { clase: 'bg-green-600 text-white', texto: 'Verde' },
  AMARILLO: { clase: 'bg-yellow-400 text-gray-900', texto: 'Amarillo' },
  ROJO: { clase: 'bg-red-600 text-white', texto: 'Rojo' },
};

export const SemaforoChip: React.FC<{ semaforo: string; grande?: boolean }> = ({ semaforo, grande }) => {
  const e = ESTILO[semaforo] || ESTILO.ROJO;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold ${e.clase} ${grande ? 'px-5 py-2 text-lg' : 'px-3 py-1 text-sm'}`}>
      <span className="inline-block w-2.5 h-2.5 rounded-full bg-white/70" />
      {e.texto}
    </span>
  );
};
