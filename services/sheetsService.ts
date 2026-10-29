import { AuditRecord, Store, Person, AuditItem, CatalogosMueble, AuditoriaMueble, MuebleMM } from '../types';

// Conexión con la hoja de Google Sheets (Apps Script publicado como aplicación web).
// Se configura en Vercel: VITE_SHEETS_URL (termina en /exec) y VITE_SHEETS_KEY.
const SHEETS_URL = import.meta.env.VITE_SHEETS_URL || '';
const SHEETS_KEY = import.meta.env.VITE_SHEETS_KEY || '';

const NO_CONFIGURADO = 'Falta configurar la conexión con Google Sheets (VITE_SHEETS_URL y VITE_SHEETS_KEY en Vercel).';

// Text/plain evita la consulta previa de CORS que Apps Script no contesta.
async function llamar<T>(accion: string, datos: Record<string, unknown> = {}): Promise<T> {
  if (!SHEETS_URL || !SHEETS_KEY) throw new Error(NO_CONFIGURADO);
  let resp: Response;
  try {
    resp = await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...datos, accion, clave: SHEETS_KEY }),
    });
  } catch {
    throw new Error('No se pudo conectar con Google Sheets. Revisa tu señal de internet e intenta de nuevo.');
  }
  let json: { ok: boolean; datos?: T; error?: string };
  try {
    json = await resp.json();
  } catch {
    throw new Error('La hoja no respondió bien. Revisa que la dirección del script termine en /exec y que esté publicado para "Cualquier usuario".');
  }
  if (!json.ok) throw new Error(json.error || 'Error desconocido en la hoja.');
  return json.datos as T;
}

// Mismas reglas que la auditoría Berel de siempre (95 / 85).
const calcularEstatus = (total: number): AuditRecord['status'] =>
  total >= 95 ? 'TIENDA_MODELO' : total >= 85 ? 'ACEPTABLE' : 'CRITICO';

// Las lecturas que fallan al abrir una pantalla avisan una sola vez y regresan lista vacía.
let avisado = false;
const avisar = (e: unknown) => {
  console.error(e);
  if (avisado) return;
  avisado = true;
  alert((e as Error).message);
  setTimeout(() => { avisado = false; }, 3000);
};

const imagenes = new Map<string, Promise<string>>();

export const SheetsService = {
  getStores: async (): Promise<Store[]> => {
    try {
      return await llamar<Store[]>('getStores');
    } catch (e) {
      avisar(e);
      return [];
    }
  },

  addStore: async (store: Store): Promise<void> => {
    try {
      await llamar('addStore', { tienda: store });
    } catch (e) {
      alert('Error al guardar tienda: ' + (e as Error).message);
    }
  },

  getPeople: async (): Promise<Person[]> => {
    try {
      return await llamar<Person[]>('getPeople');
    } catch (e) {
      avisar(e);
      return [];
    }
  },

  addPerson: async (person: Person): Promise<void> => {
    try {
      await llamar('addPerson', { persona: person });
    } catch (e) {
      alert('Error al guardar personal: ' + (e as Error).message);
    }
  },

  // El folio lo pone la hoja (AB-AAAAMMDD-0001). Las firmas se van a Drive y regresan como link.
  saveAudit: async (audit: AuditRecord): Promise<AuditRecord> => {
    try {
      const r = await llamar<{ id: string; folio: string; managerSignature: string; auditorSignature: string }>(
        'saveAudit',
        { auditoria: audit },
      );
      // Para el reporte inmediato se conservan las firmas que ya están en el celular.
      return {
        ...audit,
        id: r.id,
        folio: r.folio,
        managerSignature: audit.managerSignature || r.managerSignature,
        auditorSignature: audit.auditorSignature || r.auditorSignature,
      };
    } catch (e) {
      alert('Error al guardar auditoría: ' + (e as Error).message);
      throw e;
    }
  },

  getAudits: async (): Promise<AuditRecord[]> => {
    type Fila = Omit<AuditRecord, 'items' | 'totalScore' | 'status'> & { registered: string; items: AuditItem[] };
    let filas: Fila[];
    try {
      filas = await llamar<Fila[]>('getAudits');
    } catch (e) {
      avisar(e);
      return [];
    }
    return filas
      .map(({ registered, ...row }) => {
        const items: Record<string, AuditItem> = {};
        row.items.forEach(i => { items[i.questionId] = { ...i, observation: i.observation || '' }; });
        const totalScore = row.items.reduce((acc, i) => acc + i.score, 0);
        return {
          ...row,
          storeName: row.storeName || 'Desconocido',
          managerName: row.managerName || 'Desconocido',
          auditorName: row.auditorName || 'Desconocido',
          actionPlan: row.actionPlan || '',
          items,
          totalScore,
          status: calcularEstatus(totalScore),
          orden: registered || `${row.date} ${row.time}`,
        };
      })
      // Más recientes primero.
      .sort((a, b) => b.orden.localeCompare(a.orden))
      .map(({ orden, ...a }) => a);
  },

  deleteAudit: async (id: string): Promise<void> => {
    try {
      await llamar('deleteAudit', { id });
    } catch (e) {
      alert('Error al borrar auditoría: ' + (e as Error).message);
    }
  },

  // --- Supervisión de Mueble · Ferre Mina ---

  getCatalogosMueble: (): Promise<CatalogosMueble> => llamar<CatalogosMueble>('mmCatalogos'),

  /** Historial de supervisión de mueble, más recientes primero (por fecha de la auditoría). */
  getAuditoriasMueble: async (): Promise<AuditoriaMueble[]> => {
    const lista = await llamar<(AuditoriaMueble & { registrado: string })[]>('mmAuditorias');
    const orden = (a: AuditoriaMueble & { registrado: string }) => `${a.fecha} ${a.hora} ${a.registrado || ''}`;
    return lista
      .sort((a, b) => orden(b).localeCompare(orden(a)))
      .map(({ registrado, ...a }) => a);
  },

  /** Alta (original vacío) o cambio de un mueble. */
  guardarMueble: (mueble: MuebleMM, original: string) => llamar<{ numero: string }>('mmMuebleGuardar', { mueble, original }),

  borrarMueble: (numero: string) => llamar<{ borradas: number }>('mmMuebleBorrar', { numero }),

  // El folio lo pone la hoja (SM-AAAAMMDD-0001). Fotos y firmas se van a Drive.
  saveAuditoriaMueble: async (a: AuditoriaMueble): Promise<AuditoriaMueble> => {
    const r = await llamar<{ id: string; folio: string }>('mmGuardar', { auditoria: a });
    return { ...a, id: r.id, folio: r.folio };
  },

  /** Convierte un link de Drive (foto o firma) en imagen que se puede mostrar y meter al PDF. */
  getImage: (src: string): Promise<string> => {
    if (!src || src.startsWith('data:')) return Promise.resolve(src);
    if (!imagenes.has(src)) {
      const p = llamar<string>('imagen', { url: src });
      p.catch(() => imagenes.delete(src));
      imagenes.set(src, p);
    }
    return imagenes.get(src)!;
  },
};
