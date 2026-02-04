import { supabase } from './supabaseClient';
import { AuditRecord, Store, Person, AuditItem } from '../types';
import { INITIAL_STORES, INITIAL_PEOPLE } from '../constants';

// Mapping from Question ID (App) to DB Column Prefix (Supabase)
// The code will automatically append '_obs' for the observation column.
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

export const StorageService = {
  // --- Stores (Table: tienda) ---
  getStores: async (): Promise<Store[]> => {
    if (!supabase) return INITIAL_STORES;

    const { data, error } = await supabase.from('tienda').select('*');
    if (error) {
      console.error('Error fetching stores (DB):', error);
      return INITIAL_STORES;
    }
    return data.map((d: any) => ({
      id: d.id,
      name: d.nombre,
      branch: d.sucursal,
      warehouse: d.almacen
    }));
  },

  addStore: async (store: Store): Promise<void> => {
    if (!supabase) {
      console.warn("Modo Offline: No se guardó la tienda en DB.");
      return;
    }
    const { error } = await supabase.from('tienda').insert({
      nombre: store.name,
      sucursal: store.branch,
      almacen: store.warehouse
    });
    if (error) console.error('Error adding store:', error);
  },

  // --- People (Tables: encargado, auditor) ---
  getPeople: async (): Promise<Person[]> => {
    if (!supabase) return INITIAL_PEOPLE;

    // Fetch both tables using singular names
    const [managers, auditors] = await Promise.all([
      supabase.from('encargado').select('*'),
      supabase.from('auditor').select('*')
    ]);

    if (managers.error) console.error('Error fetching managers:', managers.error);
    if (auditors.error) console.error('Error fetching auditors:', auditors.error);

    // If DB is empty or fails, use initial people
    if ((!managers.data || managers.data.length === 0) && (!auditors.data || auditors.data.length === 0)) {
        return INITIAL_PEOPLE;
    }

    const peopleList: Person[] = [];

    managers.data?.forEach((m: any) => {
      peopleList.push({
        id: m.id,
        name: m.nombre,
        role: 'Gerente',
        payrollId: m.nomina,
        department: m.departamento
      });
    });

    auditors.data?.forEach((a: any) => {
      peopleList.push({
        id: a.id,
        name: a.nombre,
        role: 'Auditor',
        payrollId: a.nomina,
        department: a.departamento
      });
    });

    return peopleList;
  },

  addPerson: async (person: Person): Promise<void> => {
    if (!supabase) {
       console.warn("Modo Offline: No se guardó el personal en DB.");
       return;
    }
    // Select singular table name based on role
    const table = person.role === 'Gerente' ? 'encargado' : 'auditor';
    const { error } = await supabase.from(table).insert({
      nombre: person.name,
      nomina: person.payrollId,
      departamento: person.department
    });
    if (error) console.error(`Error adding ${table}:`, error);
  },

  // --- Audits (Tables: datos_auditoria, calificaciones_auditoria) ---
  saveAudit: async (audit: AuditRecord): Promise<void> => {
    if (!supabase) {
      alert("Aviso: La base de datos no está conectada. La auditoría se generará en pantalla pero no se guardará en el historial permanente.");
      return;
    }

    // 1. Resolve Foreign Keys
    let storeId = audit.storeId;
    let managerId = audit.managerId;
    let auditorId = audit.auditorId;

    // Logic to find IDs if they are missing (e.g. mock data usage)
    const missingStore = !storeId;
    const missingManager = !managerId;
    const missingAuditor = !auditorId;

    if (missingStore || missingManager || missingAuditor) {
       try {
           const [stores, people] = await Promise.all([
               missingStore ? StorageService.getStores() : Promise.resolve([]),
               (missingManager || missingAuditor) ? StorageService.getPeople() : Promise.resolve([])
           ]);

           if (missingStore) {
               const foundStore = stores.find(s => s.name === audit.storeName);
               if (foundStore) storeId = foundStore.id;
           }
           if (missingManager) {
               const foundManager = people.find(p => p.name === audit.managerName && p.role === 'Gerente');
               if (foundManager) managerId = foundManager.id;
           }
           if (missingAuditor) {
               const foundAuditor = people.find(p => p.name === audit.auditorName && p.role === 'Auditor');
               if (foundAuditor) auditorId = foundAuditor.id;
           }
       } catch (err) {
           console.error("Error during FK fallback lookup:", err);
       }
    }

    // 2. Insert Header (datos_auditoria)
    // Updated field: 'gerente_encargado_id' instead of 'encargado_id'
    // Added signature fields: firma_gerente, firma_auditor
    const { data: auditHeader, error: headerError } = await supabase
      .from('datos_auditoria')
      .insert({
        folio: audit.folio,
        tienda_id: storeId,
        fecha: audit.date,
        hora: audit.time,
        gerente_encargado_id: managerId,
        auditor_id: auditorId,
        firma_gerente: audit.managerSignature, // Saved as Base64 Text
        firma_auditor: audit.auditorSignature  // Saved as Base64 Text
      })
      .select()
      .single();

    if (headerError || !auditHeader) {
      console.error('Error saving audit header:', headerError);
      alert('Error al guardar datos generales en la Base de Datos: ' + (headerError?.message || 'Error desconocido'));
      return;
    }

    // 3. Prepare Details (calificaciones_auditoria)
    const detailsPayload: any = {
      datos_auditoria_id: auditHeader.id
    };

    Object.values(audit.items).forEach((item: AuditItem) => {
      const colBase = QUESTION_DB_MAP[item.questionId];
      if (colBase) {
        // Save Score
        detailsPayload[colBase] = item.score;
        // Save Observation (using _obs suffix per schema)
        detailsPayload[`${colBase}_obs`] = item.observation;
      }
    });

    const { error: detailsError } = await supabase
      .from('calificaciones_auditoria')
      .insert(detailsPayload);

    if (detailsError) {
      console.error('Error saving audit details:', detailsError);
      alert('Error al guardar las calificaciones en la BD: ' + detailsError.message);
    }
  },

  getAudits: async (): Promise<AuditRecord[]> => {
    if (!supabase) return [];

    // Updated Query: 
    // - Use singular table names in join
    // - Handle specific FK for encargado: 'encargado!gerente_encargado_id' implies using the relation via that column
    const { data, error } = await supabase
      .from('datos_auditoria')
      .select(`
        id, folio, fecha, hora, firma_gerente, firma_auditor,
        tienda (id, nombre),
        encargado (id, nombre),
        auditor (id, nombre),
        calificaciones_auditoria (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
      return [];
    }

    // Transform DB shape to App shape
    return data.map((row: any) => {
      const items: Record<string, AuditItem> = {};
      const scores = row.calificaciones_auditoria?.[0]; // Assuming 1-to-1 or taking first

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
        managerSignature: row.firma_gerente || '', // Retrieve signature
        auditorSignature: row.firma_auditor || ''  // Retrieve signature
      };
    });
  },

  deleteAudit: async (id: string): Promise<void> => {
    if (!supabase) return;
    
    // Deleting the parent in 'datos_auditoria' should cascade delete 'calificaciones_auditoria'
    // based on the schema "ON DELETE CASCADE", but we can be explicit.
    
    const { error } = await supabase.from('datos_auditoria').delete().eq('id', id);
    if (error) console.error('Error deleting audit:', error);
  }
};