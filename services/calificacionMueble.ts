// Supervisión de Mueble v2 · Ferre Mina: puntos y reglas de calificación.
// Sin dependencias para poder probarlo con `npm test`.

export type BloqueId = 'L' | 'P' | 'E' | 'S';
export type Resultado = 'CUMPLE' | 'NO_CUMPLE' | 'NA';
export type Semaforo = 'VERDE' | 'AMARILLO' | 'ROJO';

export interface PuntoMueble {
  id: string;
  bloque: BloqueId;
  texto: string;
  puntos: number;
  critico: boolean;
}

export const BLOQUES: { id: BloqueId; titulo: string; puntos: number }[] = [
  { id: 'L', titulo: 'Limpieza y orden', puntos: 35 },
  { id: 'P', titulo: 'Precio y etiqueta', puntos: 30 },
  { id: 'E', titulo: 'Existencia', puntos: 20 },
  { id: 'S', titulo: 'Servicio en su zona', puntos: 15 },
];

export const PUNTOS_MUEBLE: PuntoMueble[] = [
  { id: 'L1', bloque: 'L', texto: 'Mueble, producto y pasillo limpios', puntos: 10, critico: false },
  { id: 'L2', bloque: 'L', texto: 'Producto al frente y alineado', puntos: 10, critico: false },
  { id: 'L3', bloque: 'L', texto: 'Cada producto en su espacio, sin mezclar', puntos: 10, critico: false },
  { id: 'L4', bloque: 'L', texto: 'Mueble, perfocel y empaques en buen estado', puntos: 5, critico: false },
  { id: 'P1', bloque: 'P', texto: 'Precio de 10 artículos igual al sistema', puntos: 15, critico: true },
  { id: 'P2', bloque: 'P', texto: 'La etiqueta corresponde al producto', puntos: 10, critico: false },
  { id: 'P3', bloque: 'P', texto: 'Etiqueta legible, impresa y de menos de 3 meses', puntos: 5, critico: false },
  { id: 'E1', bloque: 'E', texto: 'Cero huecos con existencia en sistema', puntos: 10, critico: false },
  { id: 'E2', bloque: 'E', texto: 'Gancho lleno según la capacidad de la etiqueta', puntos: 5, critico: false },
  { id: 'E3', bloque: 'E', texto: 'Cero cajas o tarimas en el pasillo', puntos: 5, critico: true },
  { id: 'S1', bloque: 'S', texto: 'Saluda y ofrece ayuda', puntos: 5, critico: false },
  { id: 'S2', bloque: 'S', texto: 'Ofrece complemento', puntos: 5, critico: false },
  { id: 'S3', bloque: 'S', texto: 'Conoce precios y usos de su zona', puntos: 5, critico: false },
];

export interface ResumenBloque {
  id: BloqueId;
  titulo: string;
  obtenidos: number;
  posibles: number;
  na: boolean;
}

export interface Calificacion {
  obtenidos: number;
  posibles: number; // 100, o 85 si Servicio va en N/A
  calificacion: number; // 0–100 con un decimal
  semaforo: Semaforo;
  criticosFallados: string[]; // ids de puntos críticos en "No cumple"
  porBloque: ResumenBloque[];
  contestados: number;
  completa: boolean;
}

const redondear1 = (n: number) => Math.round(n * 10) / 10;

export function semaforoDe(calificacion: number, hayCriticoFallado: boolean): Semaforo {
  const base: Semaforo = calificacion >= 90 ? 'VERDE' : calificacion >= 80 ? 'AMARILLO' : 'ROJO';
  // Un punto crítico fallado deja el resultado en Amarillo como máximo.
  return hayCriticoFallado && base === 'VERDE' ? 'AMARILLO' : base;
}

/**
 * Cumple = puntos completos; No cumple = 0; N/A (solo Servicio) quita esos puntos del total posible.
 * Los puntos sin contestar cuentan como 0 para la calificación en vivo.
 */
export function calificar(respuestas: Record<string, Resultado | undefined>): Calificacion {
  let obtenidos = 0;
  let posibles = 0;
  let contestados = 0;
  const criticosFallados: string[] = [];

  const porBloque: ResumenBloque[] = BLOQUES.map(b => {
    const puntos = PUNTOS_MUEBLE.filter(p => p.bloque === b.id);
    let obt = 0;
    let pos = 0;
    puntos.forEach(p => {
      const r = respuestas[p.id];
      if (r) contestados++;
      if (r === 'NA' && p.bloque === 'S') return;
      pos += p.puntos;
      if (r === 'CUMPLE') obt += p.puntos;
      if (r === 'NO_CUMPLE' && p.critico) criticosFallados.push(p.id);
    });
    obtenidos += obt;
    posibles += pos;
    return { id: b.id, titulo: b.titulo, obtenidos: obt, posibles: pos, na: pos === 0 };
  });

  const calificacion = posibles ? redondear1((obtenidos / posibles) * 100) : 0;
  return {
    obtenidos,
    posibles,
    calificacion,
    semaforo: semaforoDe(calificacion, criticosFallados.length > 0),
    criticosFallados,
    porBloque,
    contestados,
    completa: contestados === PUNTOS_MUEBLE.length,
  };
}

export interface EvidenciaMueble {
  foto?: string;
  observacion?: string;
  accion?: string;
  responsable?: string;
  fechaCompromiso?: string;
}

/** Lo que falta para poder guardar (vacío = se puede guardar). */
export function faltantesPuntos(
  respuestas: Record<string, Resultado | undefined>,
  evidencias: Record<string, EvidenciaMueble | undefined>,
): string[] {
  const faltan: string[] = [];
  PUNTOS_MUEBLE.forEach(p => {
    const r = respuestas[p.id];
    if (!r) {
      faltan.push(`${p.id}: falta calificar`);
      return;
    }
    if (r === 'NA' && p.bloque !== 'S') faltan.push(`${p.id}: N/A solo aplica en Servicio`);
    if (r !== 'NO_CUMPLE') return;
    const e = evidencias[p.id] || {};
    const sinLlenar = [
      !e.foto && 'foto',
      !e.observacion?.trim() && 'observación',
      !e.accion?.trim() && 'acción correctiva',
      !e.responsable?.trim() && 'responsable',
      !e.fechaCompromiso && 'fecha compromiso',
    ].filter(Boolean);
    if (sinLlenar.length) faltan.push(`${p.id}: falta ${sinLlenar.join(', ')}`);
  });
  return faltan;
}

/** Lunes (AAAA-MM-DD) de la semana de una fecha AAAA-MM-DD. La semana va de lunes a domingo. */
export function lunesDeSemana(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  const dia = (f.getUTCDay() + 6) % 7; // lunes = 0
  f.setUTCDate(f.getUTCDate() - dia);
  return f.toISOString().slice(0, 10);
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Mismo nombre ignorando acentos y mayúsculas ("Rocío" = "rocio"). */
export const mismoNombre = (a?: string, b?: string) => !!a && !!b && normalizar(a) === normalizar(b);
