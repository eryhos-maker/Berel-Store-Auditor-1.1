import { supabase } from './supabaseClient';
import { AuditRecord, Store, Person, AuditItem } from '../types';
import { INITIAL_STORES, INITIAL_PEOPLE } from '../constants';

// Mapping from Question ID (App) to DB Column Prefix (Supabase)
const QUESTION_DB_MAP: Record<string, string> = {
  '1.1': 'arqueo_de_caja',
  '1.2': 'fondo_fijo',
  '1.3': 'auditoria_aleatoria',
  '1.4': 'carpeta_operativa',
  '1.5': 'cortes_de_terminal',
  '2.1': 'pintura_de_fachada',
  '2.2': 'marquesina_anuncios',
  '2.3': 'accesibilidad',
  '2.4': 'vidrios_y_escaparate',
  '3.1': 'orden_y_limpieza',
  '3.2': 'frenteo_de_producto',
  '3.3': 'precios',
  '3.4': 'layout_estrategico',
  '3.5': 'iluminacion_interior',
  '4.1': 'dosificadora_limpieza',
  '4.2': 'dosificadora_niveles',
  '4.3': 'revolvedora_estado',
  '4.4': 'area_de_igualacion',
  '5.1': 'imagen_personal',
  '5.2': 'protocolo_de_saludo',
  '5.3': 'venta_sugestiva',
};

// Helper to check if a string is a valid UUID (roughly) to avoid DB crashes
const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export const StorageService = {
  // --- Stores (Table: tienda) ---
  getStores: async (): Promise<Store[]> => {
    if (!supabase) return INITIAL_STORES;

    const { data, error } = await supabase.from('tienda').select('*');
    if (error) {
      console.error('Error fetching stores (DB):', error);
      // Si hay error de conexión, usamos datos locales
      return INITIAL_STORES;
    }
    
    // IMPORTANTE: Si estamos conectados a Supabase pero la tabla está vacía,
    // devolvemos vacío []. NO devolvemos INITIAL_STORES.
    // Esto obliga al usuario a crear tiendas reales en la Admin Console,
    // asegurando que tengan IDs tipo UUID válidos.
    if (!data || data.length === 0) return [];

    return data.map((d: any) => ({
      id: d.id,
      name: d.nombre,
      branch: d.sucursal,
      warehouse: d.almacen
    }));
  },

  addStore: async (store: Store): Promise<void> => {
    if (!supabase) return;

    // Insertamos solo los datos, dejamos que Supabase genere el ID (gen_random_uuid)
    const { error } = await supabase.from('tienda').insert({
      nombre: store.name,
      sucursal: store.branch,
      almacen: store.warehouse
    });
    if (error) {
      console.error('Error adding store:', error);
      alert('Error al guardar tienda: ' + error.message);
    }
  },

  // --- People (Tables: encargado, auditor) ---
  getPeople: async (): Promise<Person[]> => {
    if (!supabase) return INITIAL_PEOPLE;

    const [managers, auditors] = await Promise.all([
      supabase.from('encargado').select('*'),
      supabase.from('auditor').select('*')
    ]);

    const peopleList: Person[] = [];

    if (managers.data) {
      managers.data.forEach((m: any) => {
        peopleList.push({
          id: m.id,
          name: m.nombre,
          role: 'Gerente',
          payrollId: m.nomina,
          department: m.departamento
        });
      });
    }

    if (auditors.data) {
      auditors.data.forEach((a: any) => {
        peopleList.push({
          id: a.id,
          name: a.nombre,
          role: 'Auditor',
          payrollId: a.nomina,
          department: a.departamento
        });
      });
    }

    // Mismo criterio: Si la DB está vacía, regresamos vacío para forzar registro real.
    return peopleList;
  },

  addPerson: async (person: Person): Promise<void> => {
    if (!supabase) return;
    
    const table = person.role === 'Gerente' ? 'encargado' : 'auditor';
    const { error } = await supabase.from(table).insert({
      nombre: person.name,
      nomina: person.payrollId,
      departamento: person.department
    });
    
    if (error) {
      console.error(`Error adding ${table}:`, error);
      alert('Error al guardar personal: ' + error.message);
    }
  },

  // --- Audits (Tables: datos_auditoria, calificaciones_auditoria) ---
  saveAudit: async (audit: AuditRecord): Promise<void> => {
    if (!supabase) {
      alert("Error: No hay conexión con la base de datos.");
      return;
    }

    // Validación de seguridad para evitar crashes en Postgres
    if (!isUUID(audit.storeId || '') || !isUUID(audit.managerId || '') || !isUUID(audit.auditorId || '')) {
      alert("⚠️ Error de integridad de datos:\n\nEstás intentando guardar una auditoría usando datos de ejemplo (Tienda o Personal con IDs inválidos).\n\nSOLUCIÓN: Ve a la 'Consola Administrativa', registra Tiendas y Personal reales, y vuelve a iniciar la auditoría seleccionando esos nuevos registros.");
      return;
    }

    // 1. Insert Header
    const { data: auditHeader, error: headerError } = await supabase
      .from('datos_auditoria')
      .insert({
        folio: audit.folio,
        tienda_id: audit.storeId,
        fecha: audit.date,
        hora: audit.time,
        gerente_encargado_id: audit.managerId,
        auditor_id: audit.auditorId
      })
      .select()
      .single();

    if (headerError || !auditHeader) {
      console.error('Error saving audit header:', headerError);
      alert('Error al guardar auditoría: ' + (headerError?.message || 'Error desconocido'));
      return;
    }

    // 2. Update Signatures
    if (audit.managerId && audit.managerSignature) {
      await supabase.from('encargado')
        .update({ firma_encargado: audit.managerSignature })
        .eq('id', audit.managerId);
    }
    if (audit.auditorId && audit.auditorSignature) {
      await supabase.from('auditor')
        .update({ firma_auditor: audit.auditorSignature })
        .eq('id', audit.auditorId);
    }

    // 3. Prepare Details
    const detailsPayload: any = {
      datos_auditoria_id: auditHeader.id
    };

    Object.values(audit.items).forEach((item: AuditItem) => {
      const colBase = QUESTION_DB_MAP[item.questionId];
      if (colBase) {
        detailsPayload[colBase] = item.score;
        detailsPayload[`${colBase}_obs`] = item.observation;
      }
    });

    const { error: detailsError } = await supabase
      .from('calificaciones_auditoria')
      .insert(detailsPayload);

    if (detailsError) {
      console.error('Error saving details:', detailsError);
    } else {
      console.log("Auditoría guardada exitosamente en Supabase");
    }
  },

  getAudits: async (): Promise<AuditRecord[]> => {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('datos_auditoria')
      .select(`
        id, folio, fecha, hora,
        tienda (id, nombre),
        encargado (id, nombre, firma_encargado),
        auditor (id, nombre, firma_auditor),
        calificaciones_auditoria (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
      return [];
    }

    return data.map((row: any) => {
      const items: Record<string, AuditItem> = {};
      const scores = row.calificaciones_auditoria?.[0];

      if (scores) {
        Object.keys(QUESTION_DB_MAP).forEach(qId => {
          const colBase = QUESTION_DB_MAP[qId];
          const val = scores[colBase];
          const obs = scores[`${colBase}_obs`];

          if (val !== undefined && val !== null) {
            items[qId] = {
              questionId: qId,
              score: val,
              observation: obs || '' 
            };
          }
        });
      }

      const totalScore = Object.values(items).reduce((acc, curr) => acc + curr.score, 0);
      let status: AuditRecord['status'] = 'CRITICO';
      if (totalScore >= 95) status = 'TIENDA_MODELO';
      else if (totalScore >= 85) status = 'ACEPTABLE';

      return {
        id: row.id,
        folio: row.folio,
        storeName: row.tienda?.nombre || 'Desconocido',
        managerName: row.encargado?.nombre || 'Desconocido',
        auditorName: row.auditor?.nombre || 'Desconocido',
        storeId: row.tienda?.id,
        managerId: row.encargado?.id,
        auditorId: row.auditor?.id,
        date: row.fecha,
        time: row.hora,
        items: items,
        totalScore: totalScore,
        status: status,
        actionPlan: '',
        managerSignature: row.encargado?.firma_encargado || '',
        auditorSignature: row.auditor?.firma_auditor || ''
      };
    });
  },

  deleteAudit: async (id: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase.from('datos_auditoria').delete().eq('id', id);
    if (error) console.error('Error deleting audit:', error);
  }
};