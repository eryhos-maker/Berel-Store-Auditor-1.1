import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calificar, faltantesPuntos, lunesDeSemana, mismoNombre, semaforoDe, PUNTOS_MUEBLE, type Resultado,
} from '../services/calificacionMueble.ts';

const todos = (r: Resultado) => Object.fromEntries(PUNTOS_MUEBLE.map(p => [p.id, r])) as Record<string, Resultado>;

test('los 13 puntos suman 100', () => {
  assert.equal(PUNTOS_MUEBLE.length, 13);
  assert.equal(PUNTOS_MUEBLE.reduce((s, p) => s + p.puntos, 0), 100);
});

test('todo Cumple = 100, Verde', () => {
  const c = calificar(todos('CUMPLE'));
  assert.equal(c.calificacion, 100);
  assert.equal(c.semaforo, 'VERDE');
  assert.equal(c.completa, true);
});

test('Servicio en N/A se recalcula sobre 85', () => {
  const r = { ...todos('CUMPLE'), S1: 'NA', S2: 'NA', S3: 'NA', L4: 'NO_CUMPLE' } as Record<string, Resultado>;
  const c = calificar(r);
  assert.equal(c.posibles, 85);
  assert.equal(c.obtenidos, 80);
  assert.equal(c.calificacion, 94.1); // 80 / 85 × 100
  assert.equal(c.semaforo, 'VERDE');
  assert.equal(c.porBloque.find(b => b.id === 'S')!.na, true);
});

test('falla de punto crítico con 95 pts queda en Amarillo', () => {
  const c = calificar({ ...todos('CUMPLE'), E3: 'NO_CUMPLE' });
  assert.equal(c.calificacion, 95);
  assert.deepEqual(c.criticosFallados, ['E3']);
  assert.equal(c.semaforo, 'AMARILLO');
});

test('falla crítica con calificación ya en Rojo se queda en Rojo', () => {
  const c = calificar({ ...todos('CUMPLE'), P1: 'NO_CUMPLE', L1: 'NO_CUMPLE' });
  assert.equal(c.calificacion, 75);
  assert.equal(c.semaforo, 'ROJO');
});

test('límites del semáforo: 90 Verde, 89.9 Amarillo, 80 Amarillo, 79.9 Rojo', () => {
  assert.equal(semaforoDe(90, false), 'VERDE');
  assert.equal(semaforoDe(89.9, false), 'AMARILLO');
  assert.equal(semaforoDe(80, false), 'AMARILLO');
  assert.equal(semaforoDe(79.9, false), 'ROJO');
});

test('N/A fuera de Servicio no quita puntos y no deja guardar', () => {
  const r = { ...todos('CUMPLE'), L1: 'NA' } as Record<string, Resultado>;
  assert.equal(calificar(r).posibles, 100);
  assert.deepEqual(faltantesPuntos(r, {}), ['L1: N/A solo aplica en Servicio']);
});

test('cada No cumple exige foto, observación, acción, responsable y fecha', () => {
  const r = { ...todos('CUMPLE'), L2: 'NO_CUMPLE', P2: 'NO_CUMPLE' } as Record<string, Resultado>;
  const evid = {
    L2: { foto: 'data:image/jpeg;base64,xx', observacion: 'Producto atrás', accion: 'Frentear', responsable: 'Luis', fechaCompromiso: '2026-10-30' },
    P2: { foto: 'data:image/jpeg;base64,xx', observacion: '  ' },
  };
  assert.deepEqual(faltantesPuntos(r, evid), ['P2: falta observación, acción correctiva, responsable, fecha compromiso']);
});

test('puntos sin contestar no dejan guardar', () => {
  const r = todos('CUMPLE');
  delete (r as Record<string, Resultado | undefined>).S3;
  assert.deepEqual(faltantesPuntos(r, {}), ['S3: falta calificar']);
  assert.equal(calificar(r).completa, false);
});

test('la semana empieza en lunes', () => {
  assert.equal(lunesDeSemana('2026-10-29'), '2026-10-26'); // jueves
  assert.equal(lunesDeSemana('2026-10-26'), '2026-10-26'); // lunes
  assert.equal(lunesDeSemana('2026-11-01'), '2026-10-26'); // domingo
});

test('nombres iguales sin importar acentos ni mayúsculas', () => {
  assert.equal(mismoNombre('Rocío', ' rocio '), true);
  assert.equal(mismoNombre('Rocío', 'Esteban'), false);
  assert.equal(mismoNombre('', ''), false);
});
