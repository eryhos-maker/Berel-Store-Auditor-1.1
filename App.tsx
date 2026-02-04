import React, { useState } from 'react';
import { AuditRecord } from './types';
import AuditForm from './components/AuditForm';
import ReportView from './components/ReportView';
import AdminConsole from './components/AdminConsole';
import { StorageService } from './services/storageService';

type ViewState = 'HOME' | 'AUDIT' | 'REPORT' | 'ADMIN';

// Tooltip Component for UX improvement
const SimpleTooltip = ({ message, children }: { message: string, children?: React.ReactNode }) => {
  return (
    <div className="group relative flex flex-col items-center w-full">
      {children}
      <div className="absolute bottom-full mb-2 hidden flex-col items-center group-hover:flex z-50 w-64">
        <span className="relative z-10 p-2 text-xs leading-tight text-white bg-gray-900 shadow-xl rounded-md text-center border border-gray-700">
          {message}
        </span>
        <div className="w-3 h-3 -mt-2 rotate-45 bg-gray-900 border-b border-r border-gray-700"></div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('HOME');
  const [currentAudit, setCurrentAudit] = useState<AuditRecord | null>(null);
  const [previousView, setPreviousView] = useState<ViewState>('HOME');

  const startAudit = () => {
    setView('AUDIT');
  };

  const handleFinishAudit = async (audit: AuditRecord) => {
    await StorageService.saveAudit(audit);
    setCurrentAudit(audit);
    setPreviousView('HOME');
    setView('REPORT');
  };

  const handleOpenAdmin = () => {
    setView('ADMIN');
  };

  const handleViewAuditFromAdmin = (audit: AuditRecord) => {
    setCurrentAudit(audit);
    setPreviousView('ADMIN');
    setView('REPORT');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
      {/* Berel Colorful Top Bar */}
      <div className="h-2 w-full bg-gradient-to-r from-yellow-400 via-red-600 to-blue-900 sticky top-0 z-50"></div>

      {view === 'HOME' && (
        <div className="flex flex-col items-center justify-center flex-grow px-4 bg-white">
          <div className="max-w-md w-full text-center">
            {/* Logo Image */}
            <div className="mb-8 flex justify-center">
              <img 
                src="https://www.berel.com.mx/sites/default/files/logo_berel_0.png" 
                alt="Berel" 
                className="h-24 object-contain"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = "text-5xl font-black text-blue-900 tracking-tighter";
                    fallback.innerText = "Berel";
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>

            <h1 className="text-2xl font-bold text-gray-800 mb-2">Auditoría de Tiendas</h1>
            <p className="text-gray-500 mb-10">Evaluación de Estándares Operativos y Servicio</p>

            <div className="space-y-4">
              <button 
                onClick={startAudit}
                className="w-full bg-red-600 text-white text-lg font-bold py-4 rounded-xl shadow-lg transform transition hover:scale-105 hover:bg-red-700 flex items-center justify-center"
              >
                <span className="mr-3 text-2xl">📋</span> Iniciar Nueva Auditoría
              </button>
              
              <SimpleTooltip message="Panel para administradores: Consulta el historial de auditorías, exporta reportes a CSV y administra el catálogo de tiendas y personal.">
                <button 
                  onClick={handleOpenAdmin}
                  className="w-full bg-white text-blue-900 font-semibold py-3 rounded-xl hover:bg-blue-50 transition border-2 border-blue-900"
                >
                  ⚙️ Consola Administrativa
                </button>
              </SimpleTooltip>
            </div>

            <div className="mt-12 text-center">
               <p className="text-xs text-gray-400 uppercase tracking-widest">Pinta con confianza</p>
               <p className="text-[10px] text-gray-300 mt-1">v1.0.0 | Berel Retail</p>
            </div>
          </div>
        </div>
      )}

      {view === 'AUDIT' && (
        <div className="min-h-screen bg-gray-50 w-full">
           <header className="bg-white border-b border-gray-200 p-4 sticky top-2 z-40 shadow-sm flex justify-between items-center">
             <div className="flex items-center gap-2">
               <img src="https://www.berel.com.mx/sites/default/files/logo_berel_0.png" alt="Logo" className="h-8" />
               <h1 className="font-bold text-blue-900 border-l-2 border-gray-300 pl-3 ml-1 text-sm md:text-base">Nueva Auditoría</h1>
             </div>
             <button onClick={() => setView('HOME')} className="text-xs text-gray-500 hover:text-red-600 font-medium">Cancelar</button>
           </header>
           <div className="p-4">
            <AuditForm 
              onFinish={handleFinishAudit} 
              onCancel={() => setView('HOME')} 
            />
           </div>
        </div>
      )}

      {view === 'REPORT' && currentAudit && (
        <ReportView 
          audit={currentAudit} 
          onClose={() => setView(previousView)} 
        />
      )}

      {view === 'ADMIN' && (
        <AdminConsole 
          onBack={() => setView('HOME')} 
          onViewAudit={handleViewAuditFromAdmin} 
        />
      )}
    </div>
  );
};

export default App;