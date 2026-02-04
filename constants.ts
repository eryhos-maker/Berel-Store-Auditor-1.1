import { Section, Store, Person } from './types';

// Initial Mock Data
export const INITIAL_STORES: Store[] = [
  { id: '1', name: 'Berel Centro', branch: 'S-001', warehouse: 'ALM-CENTRO' },
  { id: '2', name: 'Berel Norte', branch: 'S-002', warehouse: 'ALM-NORTE' },
  { id: '3', name: 'Berel Sur', branch: 'S-003', warehouse: 'ALM-SUR' },
  { id: '4', name: 'Berel Plaza Real', branch: 'S-004', warehouse: 'ALM-PLAZA' },
];

export const INITIAL_PEOPLE: Person[] = [
  { id: '1', name: 'Juan Pérez', role: 'Auditor', payrollId: '10054', department: 'Auditoría Interna' },
  { id: '2', name: 'Maria López', role: 'Gerente', payrollId: '20033', department: 'Ventas Retail' },
  { id: '3', name: 'Carlos Ruiz', role: 'Gerente', payrollId: '20045', department: 'Ventas Retail' },
];

// Audit Structure based on CSV
export const AUDIT_SECTIONS: Section[] = [
  {
    id: 1,
    title: 'CONTROL FINANCIERO Y ADMINISTRATIVO',
    maxPoints: 30,
    questions: [
      {
        id: '1.1',
        category: 'Arqueo de Caja (Ciego)',
        criterion: 'Diferencia máxima permitida ±$10.00 MXN. Incluye efectivo y vouchers.',
        maxPoints: 6,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 3, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 6, color: 'bg-green-600' },
        ],
      },
      {
        id: '1.2',
        category: 'Fondo Fijo (Morralla)',
        criterion: 'Completo y con la denominación correcta para dar cambio.',
        maxPoints: 6,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 3, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 6, color: 'bg-green-600' },
        ],
      },
      {
        id: '1.3',
        category: 'Auditoría Aleatoria (5 SKUs)',
        criterion: 'Conteo físico coincide 100% con sistema (Sin sobrantes ni faltantes).',
        maxPoints: 6,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 3, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 6, color: 'bg-green-600' },
        ],
      },
      {
        id: '1.4',
        category: 'Carpeta Operativa',
        criterion: 'Licencia funcionamiento, pagos de servicios y bitácora de asistencia al día.',
        maxPoints: 6,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 3, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 6, color: 'bg-green-600' },
        ],
      },
      {
        id: '1.5',
        category: 'Cortes de Terminal',
        criterion: 'Vouchers firmados y ordenados cronológicamente del día.',
        maxPoints: 6,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 3, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 6, color: 'bg-green-600' },
        ],
      },
    ],
  },
  {
    id: 2,
    title: 'IMAGEN EXTERIOR Y FACHADA',
    maxPoints: 20,
    questions: [
      {
        id: '2.1',
        category: 'Pintura de Fachada',
        criterion: 'Colores Berel vigentes (Rojo/Amarillo), sin descarapelamiento ni grafitis.',
        maxPoints: 5,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 3, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 5, color: 'bg-green-600' },
        ],
      },
      {
        id: '2.2',
        category: 'Marquesina/Anuncios',
        criterion: 'Limpios, iluminación funcionando 100%, sin lonas "hechizas".',
        maxPoints: 5,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 3, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 5, color: 'bg-green-600' },
        ],
      },
      {
        id: '2.3',
        category: 'Accesibilidad',
        criterion: 'Entrada y banqueta libre de botes u obstáculos.',
        maxPoints: 5,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 3, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 5, color: 'bg-green-600' },
        ],
      },
      {
        id: '2.4',
        category: 'Vidrios y Escaparate',
        criterion: 'Limpios, sin exceso de microperforados que tapen la vista interior.',
        maxPoints: 5,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 3, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 5, color: 'bg-green-600' },
        ],
      },
    ],
  },
  {
    id: 3,
    title: 'PISO DE VENTA Y EXHIBICIÓN',
    maxPoints: 20,
    questions: [
      {
        id: '3.1',
        category: "Orden y Limpieza (5's)",
        criterion: 'Piso barrido/trapeado, estantes sin polvo, bote de basura vacío.',
        maxPoints: 4,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 2, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 4, color: 'bg-green-600' },
        ],
      },
      {
        id: '3.2',
        category: 'Frenteo de Producto',
        criterion: 'Productos alineados al borde del estante, etiquetas al frente.',
        maxPoints: 4,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 2, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 4, color: 'bg-green-600' },
        ],
      },
      {
        id: '3.3',
        category: 'Precios (Cenefas)',
        criterion: '100% de los productos con precio visible y actualizado.',
        maxPoints: 4,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 2, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 4, color: 'bg-green-600' },
        ],
      },
      {
        id: '3.4',
        category: 'Layout Estratégico',
        criterion: 'Producto gancho al frente, zona de color despejada.',
        maxPoints: 4,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 2, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 4, color: 'bg-green-600' },
        ],
      },
      {
        id: '3.5',
        category: 'Iluminación Interior',
        criterion: 'Todas las lámparas funcionando (luz cálida/neutra recomendada).',
        maxPoints: 4,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 2, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 4, color: 'bg-green-600' },
        ],
      },
    ],
  },
  {
    id: 4,
    title: 'MAQUINARIA Y EQUIPO',
    maxPoints: 15,
    questions: [
      {
        id: '4.1',
        category: 'Dosificadora (Limpieza)',
        criterion: 'Boquillas sin obstrucción (pintura seca). Bandeja de goteo limpia.',
        maxPoints: 4,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 2, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 4, color: 'bg-green-600' },
        ],
      },
      {
        id: '4.2',
        category: 'Dosificadora (Niveles)',
        criterion: 'Cilindros de tinta rellenos (mínimo al 25%).',
        maxPoints: 4,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 2, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 4, color: 'bg-green-600' },
        ],
      },
      {
        id: '4.3',
        category: 'Revolvedora (Estado)',
        criterion: 'Gomas de sujeción seguras, sin ruidos extraños, timer funcional.',
        maxPoints: 3,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 2, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 3, color: 'bg-green-600' },
        ],
      },
      {
        id: '4.4',
        category: 'Área de Igualación',
        criterion: 'Mesa de trabajo limpia, sin manchas de derrame recientes.',
        maxPoints: 4,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 2, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 4, color: 'bg-green-600' },
        ],
      },
    ],
  },
  {
    id: 5,
    title: 'PERSONAL Y SERVICIO',
    maxPoints: 15,
    questions: [
      {
        id: '5.1',
        category: 'Imagen Personal',
        criterion: 'Uniforme Berel completo, limpio y fajado. Calzado de seguridad.',
        maxPoints: 5,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 3, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 5, color: 'bg-green-600' },
        ],
      },
      {
        id: '5.2',
        category: 'Protocolo de Saludo',
        criterion: 'Saludo inmediato al cliente al cruzar la puerta.',
        maxPoints: 5,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 3, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 5, color: 'bg-green-600' },
        ],
      },
      {
        id: '5.3',
        category: 'Venta Sugestiva',
        criterion: 'Ofrece complementos (rodillos, cinta, lija) en cada venta.',
        maxPoints: 5,
        options: [
          { label: 'Malo', value: 1, color: 'bg-red-500' },
          { label: 'Regular', value: 3, color: 'bg-yellow-500' },
          { label: 'Bueno', value: 5, color: 'bg-green-600' },
        ],
      },
    ],
  },
];
