import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuditRecord, Store, Person } from '../types';
import { SheetsService } from '../services/sheetsService';
import { AUDIT_SECTIONS } from '../constants';
import { BarraFDN } from './marca';

const ConsolaMueble = lazy(() => import('./mueble/ConsolaMueble'));
const CatalogoMuebles = lazy(() => import('./mueble/CatalogoMuebles'));

interface AdminConsoleProps {
  onBack: () => void;
  onViewAudit: (audit: AuditRecord) => void;
}

const AdminConsole: React.FC<AdminConsoleProps> = ({ onBack, onViewAudit }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'DATA' | 'MUEBLE' | 'MUEBLES'>('MUEBLE');
  const [history, setHistory] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter State
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Master Data Inputs - Stores
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreBranch, setNewStoreBranch] = useState('');
  const [newStoreWarehouse, setNewStoreWarehouse] = useState('');

  // Master Data Inputs - People
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonRole, setNewPersonRole] = useState<'Gerente' | 'Auditor'>('Auditor');
  const [newPersonPayrollId, setNewPersonPayrollId] = useState('');
  const [newPersonDepartment, setNewPersonDepartment] = useState('');

  // Modal State
  const [auditToDelete, setAuditToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'HISTORY') {
      loadData();
    }
  }, [isAuthenticated, activeTab]);

  const loadData = async () => {
    setLoading(true);
    const audits = await SheetsService.getAudits();
    setHistory(audits);
    setLoading(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Berel26') {
      setIsAuthenticated(true);
    } else {
      alert('Contraseña incorrecta');
    }
  };

  const confirmDelete = (id: string) => {
    setAuditToDelete(id);
  };

  const executeDelete = async () => {
    if (auditToDelete) {
      await SheetsService.deleteAudit(auditToDelete);
      setAuditToDelete(null);
      loadData();
    }
  };

  const cancelDelete = () => {
    setAuditToDelete(null);
  };

  // Derived filtered history
  const filteredHistory = history.filter(record => {
    const matchesStore = record.storeName.toLowerCase().includes(filterStore.toLowerCase());
    const matchesStatus = filterStatus ? record.status === filterStatus : true;
    
    const matchesStartDate = filterStartDate ? record.date >= filterStartDate : true;
    const matchesEndDate = filterEndDate ? record.date <= filterEndDate : true;

    return matchesStore && matchesStatus && matchesStartDate && matchesEndDate;
  });

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterStore('');
    setFilterStatus('');
  };

  const handleShare = (audit: AuditRecord) => {
    const text = `Auditoría Berel - Folio: ${audit.folio || 'S/N'} - ${audit.storeName} (${audit.date}): ${audit.totalScore}/100 - ${audit.status}`;
    if (navigator.share) {
      navigator.share({
        title: 'Reporte Auditoría Berel',
        text: text,
      }).catch(console.error);
    } else {
      alert(`Copiado al portapapeles: ${text}`);
      navigator.clipboard.writeText(text);
    }
  };

  // Generic function to generate CSV from any data set
  const generateCSV = (dataToExport: AuditRecord[], filenamePrefix: string) => {
    if (dataToExport.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    // 1. Build Headers
    const staticHeaders = ['Folio', 'Fecha', 'Hora', 'Tienda', 'Gerente', 'Auditor', 'Puntaje Total', 'Estatus'];
    
    const questionHeaders: string[] = [];
    AUDIT_SECTIONS.forEach(section => {
      section.questions.forEach(q => {
        questionHeaders.push(`${q.id} (${q.category})`);
      });
    });

    const headers = [...staticHeaders, ...questionHeaders];

    // 2. Build Rows
    const rows = dataToExport.map(record => {
      const staticData = [
        record.folio,
        record.date,
        record.time,
        record.storeName,
        record.managerName,
        record.auditorName,
        record.totalScore,
        record.status
      ];

      const questionData: string[] = [];
      AUDIT_SECTIONS.forEach(section => {
        section.questions.forEach(q => {
          const item = record.items[q.id];
          questionData.push(item ? item.score.toString() : '0');
        });
      });

      return [...staticData, ...questionData].map(val => `"${val}"`).join(',');
    });

    // 3. Create CSV Content
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.map(h => `"${h}"`).join(',') + "\n" 
      + rows.join("\n");

    // 4. Trigger Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().slice(0,10);
    link.setAttribute("download", `${filenamePrefix}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFilteredCSV = () => {
    if (filteredHistory.length === 0) {
      alert("No hay datos filtrados para exportar.");
      return;
    }
    generateCSV(filteredHistory, 'Reporte_Filtrado_Berel');
  };

  const handleExportAllCSV = () => {
    if (history.length === 0) {
      alert("No hay historial registrado.");
      return;
    }
    generateCSV(history, 'Reporte_GLOBAL_Berel');
  };

  const handleAddStore = async () => {
    if (newStoreName && newStoreBranch && newStoreWarehouse) {
      await SheetsService.addStore({ 
        id: crypto.randomUUID(), 
        name: newStoreName,
        branch: newStoreBranch,
        warehouse: newStoreWarehouse
      });
      setNewStoreName('');
      setNewStoreBranch('');
      setNewStoreWarehouse('');
      alert('Tienda agregada exitosamente');
    } else {
      alert('Por favor complete todos los campos de la tienda');
    }
  };

  const handleAddPerson = async () => {
    if (newPersonName && newPersonPayrollId && newPersonDepartment) {
      await SheetsService.addPerson({ 
        id: crypto.randomUUID(), 
        name: newPersonName, 
        role: newPersonRole,
        payrollId: newPersonPayrollId,
        department: newPersonDepartment
      });
      setNewPersonName('');
      setNewPersonPayrollId('');
      setNewPersonDepartment('');
      alert('Personal agregado exitosamente');
    } else {
      alert('Por favor complete todos los campos del personal');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white p-8 max-w-sm w-full rounded-2xl border border-fdn-line shadow-fdn">
          <img src="/ferre-don-nico-logo.webp" alt="Ferre Don Nico" className="block w-[176px] mx-auto mb-4 p-3 bg-white rounded-[14px] border border-fdn-line" />
          <h2 className="text-xl font-extrabold mb-4 text-center">Consola administrativa</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-fdn-fg">Contraseña</label>
              <input 
                type="password" 
                className="mt-1 block w-full rounded-md border-fdn-campo border p-2 shadow-sm bg-fdn-bg focus:border-fdn-blue"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full min-h-[44px] bg-fdn-red text-white font-extrabold rounded-xl hover:bg-fdn-red-ink">
              Ingresar
            </button>
            <button type="button" onClick={onBack} className="w-full text-fdn-muted text-sm mt-2 hover:underline">
              Volver al inicio
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <BarraFDN titulo="Consola administrativa" subtitulo="Auditorías · Ferre Don Nico" accion="Salir" onAccion={onBack} />

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Secciones: chips como en la Consola de formularios */}
        <div className="flex gap-2 mb-6 overflow-x-auto -mx-4 px-4 pb-0.5">
          {([['MUEBLE', 'Mueble Mina'], ['MUEBLES', 'Muebles y responsables'], ['HISTORY', 'Auditorías Berel'], ['DATA', 'Catálogos Berel']] as const).map(([id, texto]) => (
            <button
              key={id}
              aria-pressed={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`flex-none rounded-full px-3.5 py-[7px] text-sm font-bold whitespace-nowrap border-[1.5px] ${activeTab === id ? 'bg-fdn-red border-fdn-red text-white' : 'bg-white border-fdn-line text-fdn-fg'}`}
            >
              {texto}
            </button>
          ))}
        </div>

        {activeTab === 'MUEBLES' && (
          <Suspense fallback={<p className="text-center text-fdn-muted py-10">Cargando…</p>}>
            <CatalogoMuebles />
          </Suspense>
        )}

        {activeTab === 'MUEBLE' && (
          <Suspense fallback={<p className="text-center text-fdn-muted py-10">Cargando…</p>}>
            <ConsolaMueble />
          </Suspense>
        )}

        {activeTab === 'HISTORY' && (
          <div>
            {/* Filters */}
            <div className="bg-white p-4 mb-4 rounded-2xl border border-fdn-line shadow-fdn">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-fdn-fg mb-1">Desde</label>
                  <input 
                    type="date" 
                    className="block w-full rounded-md border-fdn-campo border p-2 text-sm bg-fdn-bg focus:ring-fdn-blue-2 focus:border-fdn-blue-2"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-fdn-fg mb-1">Hasta</label>
                  <input 
                    type="date" 
                    className="block w-full rounded-md border-fdn-campo border p-2 text-sm bg-fdn-bg focus:ring-fdn-blue-2 focus:border-fdn-blue-2"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-fdn-fg mb-1">Buscar Tienda</label>
                  <input 
                    type="text" 
                    placeholder="Nombre..."
                    className="block w-full rounded-md border-fdn-campo border p-2 text-sm bg-fdn-bg focus:ring-fdn-blue-2 focus:border-fdn-blue-2"
                    value={filterStore}
                    onChange={(e) => setFilterStore(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-fdn-fg mb-1">Estatus</label>
                  <select 
                    className="block w-full rounded-md border-fdn-campo border p-2 text-sm bg-fdn-bg focus:ring-fdn-blue-2 focus:border-fdn-blue-2"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="TIENDA_MODELO">Tienda Modelo</option>
                    <option value="ACEPTABLE">Aceptable</option>
                    <option value="CRITICO">Crítico</option>
                  </select>
                </div>
                <button 
                  onClick={clearFilters}
                  className="w-full bg-fdn-bg hover:bg-fdn-surface-2 text-fdn-muted px-4 py-2 rounded text-sm transition-colors border border-fdn-campo font-medium"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="bg-white overflow-hidden rounded-2xl border border-fdn-line shadow-fdn">
              <div className="p-4 bg-fdn-bg border-b flex flex-col sm:flex-row justify-between items-center gap-4">
                 <h3 className="font-bold text-fdn-fg">Registro de Evaluaciones <span className="text-xs font-normal text-fdn-muted">({filteredHistory.length} filtrados / {history.length} total)</span></h3>
                 <div className="flex gap-2">
                    <button 
                      onClick={handleExportAllCSV}
                      className="bg-blue-600 hover:bg-fdn-blue text-white text-sm py-2 px-3 rounded inline-flex items-center transition-colors shadow-sm"
                    >
                      Exportar todo
                    </button>
                    <button 
                      onClick={handleExportFilteredCSV}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded inline-flex items-center transition-colors shadow-sm"
                    >
                      Exportar filtrado
                    </button>
                 </div>
              </div>
              {loading ? (
                <div className="p-8 text-center text-fdn-muted">Cargando historial...</div>
              ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-fdn-bg">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-fdn-muted uppercase tracking-wider">Folio</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-fdn-muted uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-fdn-muted uppercase tracking-wider">Tienda</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-fdn-muted uppercase tracking-wider">Puntaje</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-fdn-muted uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-fdn-muted uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredHistory.map((record) => (
                      <tr key={record.id} className="hover:bg-fdn-bg">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-fdn-red-ink font-bold">{record.folio || 'S/N'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-fdn-muted">{record.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-fdn-blue-ink">{record.storeName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-fdn-fg">{record.totalScore}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${record.status === 'TIENDA_MODELO' ? 'bg-green-100 text-green-800' : 
                              record.status === 'ACEPTABLE' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                          <button onClick={() => onViewAudit(record)} className="text-blue-600 hover:text-fdn-blue">Ver</button>
                          <button onClick={() => handleShare(record)} className="text-green-600 hover:text-green-800">Compartir</button>
                          <button onClick={() => confirmDelete(record.id)} className="text-fdn-red-ink hover:text-red-800">Eliminar</button>
                        </td>
                      </tr>
                    ))}
                    {filteredHistory.length === 0 && (
                       <tr>
                         <td colSpan={6} className="px-6 py-10 text-center text-fdn-muted">
                           {history.length > 0 ? "No hay resultados para los filtros seleccionados." : "No hay auditorías registradas."}
                         </td>
                       </tr>
                    )}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'DATA' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-fdn-line shadow-fdn">
              <h3 className="text-lg font-bold text-fdn-blue-ink mb-4 border-b pb-2">Agregar Tienda</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-fdn-fg">Nombre de Tienda</label>
                  <input 
                    type="text" 
                    className="mt-1 w-full rounded-md border-fdn-campo border p-2 focus:ring-fdn-blue-2 focus:border-fdn-blue-2 bg-fdn-bg"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-fdn-fg">Sucursal</label>
                     <input 
                       type="text" 
                       className="mt-1 w-full rounded-md border-fdn-campo border p-2 focus:ring-fdn-blue-2 focus:border-fdn-blue-2 bg-fdn-bg"
                       value={newStoreBranch}
                       onChange={(e) => setNewStoreBranch(e.target.value)}
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-fdn-fg">Almacén</label>
                     <input 
                       type="text" 
                       className="mt-1 w-full rounded-md border-fdn-campo border p-2 focus:ring-fdn-blue-2 focus:border-fdn-blue-2 bg-fdn-bg"
                       value={newStoreWarehouse}
                       onChange={(e) => setNewStoreWarehouse(e.target.value)}
                     />
                   </div>
                </div>
                <button 
                  onClick={handleAddStore}
                  className="w-full bg-fdn-blue text-white px-4 py-2 rounded hover:bg-fdn-blue-2 font-medium transition"
                >
                  Guardar Tienda
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-fdn-line shadow-fdn">
              <h3 className="text-lg font-bold text-fdn-red-ink mb-4 border-b pb-2">Agregar Personal</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-fdn-fg">Nombre Completo</label>
                  <input 
                    type="text" 
                    className="mt-1 w-full rounded-md border-fdn-campo border p-2 focus:ring-red-500 focus:border-red-500 bg-fdn-bg"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-fdn-fg">Rol</label>
                    <select 
                      className="mt-1 w-full rounded-md border-fdn-campo border p-2 focus:ring-red-500 focus:border-red-500 bg-fdn-bg"
                      value={newPersonRole}
                      onChange={(e) => setNewPersonRole(e.target.value as any)}
                    >
                      <option value="Auditor">Auditor</option>
                      <option value="Gerente">Gerente</option>
                    </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-fdn-fg">No. Nómina</label>
                     <input 
                       type="text" 
                       className="mt-1 w-full rounded-md border-fdn-campo border p-2 focus:ring-red-500 focus:border-red-500 bg-fdn-bg"
                       value={newPersonPayrollId}
                       onChange={(e) => setNewPersonPayrollId(e.target.value)}
                     />
                   </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fdn-fg">Departamento</label>
                  <input 
                    type="text" 
                    className="mt-1 w-full rounded-md border-fdn-campo border p-2 focus:ring-red-500 focus:border-red-500 bg-fdn-bg"
                    value={newPersonDepartment}
                    onChange={(e) => setNewPersonDepartment(e.target.value)}
                  />
                </div>
                <button 
                  onClick={handleAddPerson}
                  className="w-full bg-fdn-red text-white px-4 py-2 rounded hover:bg-fdn-red-ink font-medium transition"
                >
                  Guardar Personal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {auditToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-fade-in-up">
            <h3 className="text-lg font-bold text-fdn-fg mb-2">Confirmar eliminación</h3>
            <p className="text-fdn-muted mb-6">
              ¿Está seguro de eliminar esta auditoría? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-fdn-muted bg-fdn-bg rounded-lg hover:bg-fdn-surface-2 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 text-white bg-fdn-error rounded-lg hover:bg-red-900 transition-colors font-medium shadow-md"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConsole;