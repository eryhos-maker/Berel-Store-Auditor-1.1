export interface ScoringRule {
  label: string;
  value: number;
  color: string; // Tailwind class
}

export interface Question {
  id: string;
  category: string;
  criterion: string;
  maxPoints: number;
  options: ScoringRule[];
}

export interface Section {
  id: number;
  title: string;
  maxPoints: number;
  questions: Question[];
}

export interface AuditItem {
  questionId: string;
  score: number;
  observation: string;
}

export interface AuditRecord {
  id: string;
  folio: string; // Unique Identifier starting with AB
  
  // Display Names
  storeName: string;
  managerName: string;
  auditorName: string;

  // DB Foreign Keys (Optional but recommended for saving)
  storeId?: string;
  managerId?: string;
  auditorId?: string;

  date: string;
  time: string;
  items: Record<string, AuditItem>; // Map questionId to result
  totalScore: number;
  status: 'TIENDA_MODELO' | 'ACEPTABLE' | 'CRITICO';
  actionPlan?: string;
  managerSignature?: string;
  auditorSignature?: string;
}

// Master Data Types
export interface Store {
  id: string;
  name: string;
  branch: string; // Sucursal
  warehouse: string; // Almacen
}

export interface Person {
  id: string;
  name: string;
  role: 'Auditor' | 'Gerente';
  payrollId: string; // Numero de Nomina
  department: string; // Departamento
}

// --- Supervisión de Mueble · Ferre Mina ---

export interface MuebleMM {
  numero: string;
  ubicacion: string;
  tipo: string;
  familias: string;
  tramos: string;
  promocion: string;
  altoValor: string;
  titular: string;
  suplente: string;
  supervisorAudita: string;
}

export interface VendedorMM {
  nomina: string;
  nombre: string;
  horas: number | string;
  supervisor: string;
}

export interface AuditorMM {
  nomina: string;
  nombre: string;
}

export interface CatalogosMueble {
  hoy: string;
  semana: string; // lunes de la semana actual (AAAA-MM-DD)
  muebles: MuebleMM[];
  vendedores: VendedorMM[];
  auditores: AuditorMM[];
  auditadasSemana: Record<string, { folio: string; fecha: string; auditor: string }>;
}

export interface ResultadoPuntoMM {
  punto: string;
  bloque: string;
  descripcion: string;
  resultado: 'Cumple' | 'No cumple' | 'N/A';
  posibles: number;
  obtenidos: number;
  observacion: string;
}

export interface EvidenciaMM {
  foto: string; // data:image/jpeg al capturar; link de Drive al leer
  accion: string;
  responsable: string;
  fechaCompromiso: string;
}

export interface AuditoriaMueble {
  id: string;
  folio: string;
  fecha: string;
  hora: string;
  mueble: Pick<MuebleMM, 'numero' | 'ubicacion' | 'familias' | 'titular' | 'suplente'>;
  supervisorTitular: string;
  atendio: string;
  auditor: string;
  auditorEsSupervisor: boolean;
  servicioNA: boolean;
  resultados: ResultadoPuntoMM[];
  evidencias: Record<string, EvidenciaMM>;
  calificacion: { obtenidos: number; posibles: number; calificacion: number; semaforo: string; criticosFallados: string[] };
  firmaAuditor: string;
  firmoVendedor: string;
  firmaVendedor: string;
}
