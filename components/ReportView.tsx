import React, { useState } from 'react';
import { AuditRecord, AuditItem } from '../types';
import { generateActionPlan } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import { AUDIT_SECTIONS } from '../constants';

// Declare html2pdf since it is loaded via script tag
declare var html2pdf: any;

interface ReportViewProps {
  audit: AuditRecord;
  onClose: () => void;
}

// Internal Tooltip Component for UX improvement
const SimpleTooltip = ({ message, children }: { message: string, children?: React.ReactNode }) => {
  return (
    <div className="group relative flex flex-col items-center">
      {children}
      <div className="absolute bottom-full mb-2 hidden flex-col items-center group-hover:flex z-50">
        <span className="relative z-10 p-2 text-xs leading-tight text-white bg-gray-900 shadow-xl rounded-md w-48 text-center border border-gray-700">
          {message}
        </span>
        <div className="w-3 h-3 -mt-2 rotate-45 bg-gray-900 border-b border-r border-gray-700"></div>
      </div>
    </div>
  );
};

const ReportView: React.FC<ReportViewProps> = ({ audit, onClose }) => {
  const [loadingAI, setLoadingAI] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [aiPlan, setAiPlan] = useState(audit.actionPlan || '');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TIENDA_MODELO': return 'text-green-800 bg-green-50 border-green-200';
      case 'ACEPTABLE': return 'text-yellow-800 bg-yellow-50 border-yellow-200';
      case 'CRITICO': return 'text-red-800 bg-red-50 border-red-200';
      default: return 'text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'TIENDA_MODELO': return 'TIENDA MODELO';
      case 'ACEPTABLE': return 'ACEPTABLE';
      case 'CRITICO': return 'CRÍTICO';
      default: return status;
    }
  };

  const handleGeneratePlan = async () => {
    setLoadingAI(true);
    const plan = await generateActionPlan(audit);
    setAiPlan(plan);
    
    // Update local storage with the generated plan
    const updatedAudit = { ...audit, actionPlan: plan };
    StorageService.saveAudit(updatedAudit);
    
    setLoadingAI(false);
  };

  const getPDFOptions = () => {
    return {
      // Very tight margins to maximize space (0.25 inch)
      margin: [0.25, 0.25, 0.25, 0.25], 
      filename: `Auditoria_${audit.storeName.replace(/\s+/g, '_')}_${audit.folio}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      // High scale for crisp text at small font sizes
      html2canvas: { scale: 3, useCORS: true, logging: false, scrollY: 0 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
  };

  const handleDownloadPDF = async () => {
    setGeneratingPDF(true);
    const element = document.getElementById('report-content');
    try {
      await html2pdf().set(getPDFOptions()).from(element).save();
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Hubo un error al generar el PDF.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleShareWhatsApp = async () => {
    setGeneratingPDF(true);
    const text = `*REPORTE AUDITORÍA BEREL*\n\n📄 *Folio:* ${audit.folio}\n🏪 *Tienda:* ${audit.storeName}\n📅 *Fecha:* ${audit.date}\n🏆 *Calif:* ${audit.totalScore}/100\n📊 *Estado:* ${getStatusLabel(audit.status)}\n\n📎 _Se adjunta el reporte detallado en PDF._`;
    
    // 1. Try Native Sharing (Mobile) - Sends the actual PDF file
    if (navigator.share && navigator.canShare) {
      try {
        const element = document.getElementById('report-content');
        const pdfBlob = await html2pdf().set(getPDFOptions()).from(element).output('blob');
        const file = new File([pdfBlob], `Reporte_${audit.folio}.pdf`, { type: 'application/pdf' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Reporte Auditoría Berel',
            text: text,
            files: [file]
          });
          setGeneratingPDF(false);
          return;
        }
      } catch (error) {
        console.warn("Native sharing failed or cancelled, falling back to link.", error);
      }
    }

    // 2. Fallback for Desktop / WhatsApp Web
    setGeneratingPDF(false);
    
    // We cannot attach files programmatically to WhatsApp Web via URL.
    // We provide a link and an instruction.
    const message = `${text}\n\n⚠️ *NOTA PARA PC:* Descarga el PDF desde la aplicación y adjúntalo manualmente a este chat.`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const failedItems = (Object.values(audit.items) as AuditItem[]).filter(i => i.observation || i.score < 3);

  return (
    <div className="max-w-4xl mx-auto p-4 bg-gray-100 min-h-screen">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 print:hidden gap-4 bg-white p-4 rounded-lg shadow-sm">
        <button onClick={onClose} className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2">
          <span>⬅</span> Volver
        </button>
        
        <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
          {!aiPlan && !loadingAI && (
             <SimpleTooltip message="La IA analizará los hallazgos críticos de la auditoría y redactará automáticamente un plan de acción correctivo.">
               <button 
                 onClick={handleGeneratePlan}
                 className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded shadow text-sm hover:bg-blue-800 transition-colors"
               >
                 ✨ Generar Plan IA
               </button>
             </SimpleTooltip>
          )}

          <button 
            onClick={handleDownloadPDF} 
            disabled={generatingPDF}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded shadow text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {generatingPDF ? '⏳ Generando...' : '📥 Descargar PDF'}
          </button>

          <button 
            onClick={handleShareWhatsApp} 
            disabled={generatingPDF}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded shadow text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            📱 Compartir
          </button>
        </div>
      </div>

      {/* 
         PDF CONTAINER 
         Optimized for Single Page Letter Size (8.5 x 11 inches). 
         Margins set in JS options (0.25in).
         Available Width: 8in.
         Available Height: 10.5in.
         We enforce dimensions here to ensure WYSIWYG.
      */}
      <div 
        id="report-content" 
        className="bg-white shadow-lg text-gray-900 mx-auto flex flex-col" 
        style={{ 
          width: '8in', 
          height: '10.5in', // Fixed height to prevent overflow
          padding: '0.15in', // Internal padding (slight buffer inside PDF margins)
          boxSizing: 'border-box'
        }}
      >
        
        {/* HEADER - Compact */}
        <div className="flex justify-between items-center border-b-2 border-red-600 pb-2 mb-3 shrink-0">
          <div className="flex items-center gap-3">
             <img 
               src="https://www.berel.com.mx/sites/default/files/logo_berel_0.png" 
               alt="Berel" 
               className="h-10 object-contain"
               onError={(e) => { e.currentTarget.style.display='none' }}
             />
             <div>
               <h1 className="text-lg font-black text-blue-900 uppercase leading-none">Auditoría de Tienda</h1>
               <p className="text-[9px] text-gray-500 uppercase tracking-wide">Reporte de Ejecución en Punto de Venta</p>
             </div>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-bold text-gray-400">FOLIO</p>
             <p className="text-base font-mono font-bold text-red-600 leading-none">{audit.folio}</p>
          </div>
        </div>

        {/* INFO GRID - Very Compact */}
        <div className="bg-gray-50 rounded border border-gray-200 p-2 mb-3 text-[10px] shrink-0">
          <div className="grid grid-cols-4 gap-x-2 gap-y-1">
            <div className="col-span-2"><span className="font-bold text-blue-900 uppercase mr-1">Tienda:</span> {audit.storeName}</div>
            <div><span className="font-bold text-blue-900 uppercase mr-1">Fecha:</span> {audit.date}</div>
            <div><span className="font-bold text-blue-900 uppercase mr-1">Hora:</span> {audit.time}</div>
            <div className="col-span-2"><span className="font-bold text-blue-900 uppercase mr-1">Gerente:</span> {audit.managerName}</div>
            <div className="col-span-2"><span className="font-bold text-blue-900 uppercase mr-1">Auditor:</span> {audit.auditorName}</div>
          </div>
        </div>

        {/* SCORE & STATUS - Reduced height */}
        <div className="flex gap-3 mb-3 shrink-0 h-16">
          {/* Score */}
          <div className="w-1/3 border rounded-lg p-1 flex flex-col items-center justify-center bg-blue-50 border-blue-100">
            <span className="text-[9px] font-bold text-gray-500 uppercase">Calificación</span>
            <div className="flex items-baseline">
              <span className="text-3xl font-black text-blue-900 leading-none">{audit.totalScore}</span>
              <span className="text-xs text-gray-400 font-medium">/100</span>
            </div>
          </div>
          
          {/* Status */}
          <div className={`w-2/3 border rounded-lg p-1 flex flex-col justify-center items-center ${getStatusColor(audit.status)}`}>
            <span className="text-[9px] font-bold uppercase opacity-70">Estatus Operativo</span>
            <span className="text-lg font-bold tracking-wide leading-none mt-1">{getStatusLabel(audit.status)}</span>
          </div>
        </div>

        {/* ACTION PLAN - Restricted Height */}
        {aiPlan && (
          <div className="mb-3 shrink-0">
             <h3 className="text-[10px] font-bold text-blue-900 uppercase border-b border-gray-200 mb-1 pb-0.5">🚀 Plan de Acción</h3>
             <div className="bg-white text-[9px] text-justify text-gray-700 leading-snug p-2 border border-gray-100 rounded max-h-[1.8in] overflow-hidden">
               {aiPlan}
             </div>
          </div>
        )}

        {/* FINDINGS - Auto Flex Area */}
        <div className="mb-2 flex-grow flex flex-col min-h-0">
           <h3 className="text-[10px] font-bold text-blue-900 uppercase border-b border-gray-200 mb-2 pb-0.5 shrink-0">
             Detalle de Hallazgos ({failedItems.length})
           </h3>
           
           <div className="overflow-hidden flex-grow">
             {failedItems.length > 0 ? (
               <div className="grid grid-cols-2 gap-2 h-full content-start">
                 {failedItems.slice(0, 10).map((item, idx) => { // Limited to 10 to fit extra text
                   // Lookup question details
                   const question = AUDIT_SECTIONS.flatMap(s => s.questions).find(q => q.id === item.questionId);
                   const hasObs = item.observation && item.observation.trim().length > 0;
                   
                   return (
                    <div key={idx} className={`text-[9px] border p-1.5 rounded relative break-inside-avoid flex flex-col gap-1 ${
                      hasObs 
                        ? 'bg-amber-50 border-amber-300 shadow-[inset_3px_0_0_0_rgba(245,158,11,1)]' // Amber/Yellow for notes
                        : 'bg-red-50 border-red-100 shadow-[inset_3px_0_0_0_rgba(239,68,68,0.3)]'    // Red for failure without note
                    }`}>
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-blue-900 line-clamp-1 w-3/4" title={question?.category}>
                           {hasObs && <span className="mr-1 text-amber-600">📝</span>}
                           {item.questionId} - {question?.category}
                        </span>
                        <span className={`px-1 rounded font-bold text-[8px] border shrink-0 ${hasObs ? 'bg-white text-amber-700 border-amber-200' : 'bg-white text-red-600 border-red-100'}`}>
                          {item.score} pts
                        </span>
                      </div>
                      
                      {/* Description/Criterion */}
                      <p className="text-[8px] text-gray-500 italic leading-tight border-b border-gray-200 pb-1 mb-0.5 opacity-80">
                        "{question?.criterion}"
                      </p>

                      {/* Observation */}
                      <div className={`font-medium leading-tight line-clamp-2 ${hasObs ? 'bg-white/60 p-1 rounded text-gray-900 border border-amber-100' : 'text-gray-400 italic'}`}>
                        <span className={`font-bold ${hasObs ? 'text-amber-700' : 'text-gray-400'}`}>Obs:</span> {item.observation || "Sin observación detallada."}
                      </div>
                    </div>
                   );
                 })}
                 {failedItems.length > 10 && (
                   <div className="col-span-2 text-center text-[9px] text-red-600 font-bold italic">
                     ... {failedItems.length - 10} hallazgos más registrados en sistema.
                   </div>
                 )}
               </div>
             ) : (
               <div className="h-full flex items-center justify-center">
                  <p className="text-[10px] text-gray-500 italic text-center py-4 bg-gray-50 rounded w-full">
                    Sin hallazgos negativos relevantes. Excelente ejecución.
                  </p>
               </div>
             )}
           </div>
        </div>

        {/* SIGNATURES - Fixed at bottom */}
        <div className="mt-auto pt-2 shrink-0">
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center flex flex-col items-center">
              <div className="h-16 w-full flex items-end justify-center mb-1">
                {audit.managerSignature ? (
                  <img src={audit.managerSignature} alt="Firma Gerente" className="max-h-16 max-w-full object-contain" />
                ) : (
                  <div className="w-full border-b border-gray-400"></div>
                )}
              </div>
              {!audit.managerSignature && <div className="w-full border-b border-gray-400 -mt-1 mb-1"></div>}
              <p className="font-bold text-[10px] text-blue-900 uppercase truncate px-2">{audit.managerName}</p>
              <p className="text-[8px] text-gray-500">Firma Gerente</p>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="h-16 w-full flex items-end justify-center mb-1">
                {audit.auditorSignature ? (
                   <img src={audit.auditorSignature} alt="Firma Auditor" className="max-h-16 max-w-full object-contain" />
                ) : (
                   <div className="w-full border-b border-gray-400"></div>
                )}
              </div>
              {!audit.auditorSignature && <div className="w-full border-b border-gray-400 -mt-1 mb-1"></div>}
              <p className="font-bold text-[10px] text-blue-900 uppercase truncate px-2">{audit.auditorName}</p>
              <p className="text-[8px] text-gray-500">Firma Auditor</p>
            </div>
          </div>
          <div className="mt-2 text-center border-t border-gray-100 pt-1">
            <p className="text-[7px] text-gray-400">
               Documento generado digitalmente por Berel Auditor App | {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()} | ID: {audit.folio}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReportView;