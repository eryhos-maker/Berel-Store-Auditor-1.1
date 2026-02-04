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