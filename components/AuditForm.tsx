import React, { useState, useEffect, useMemo } from 'react';
import { AUDIT_SECTIONS } from '../constants';
import { Store, Person, AuditRecord, AuditItem } from '../types';
import { StorageService } from '../services/storageService';
import SignaturePad from './SignaturePad';

interface AuditFormProps {
  onFinish: (audit: AuditRecord) => void;
  onCancel: () => void;
}

const AuditForm: React.FC<AuditFormProps> = ({ onFinish, onCancel }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Header State
  const [folio, setFolio] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedAuditor, setSelectedAuditor] = useState('');
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);
  const [auditTime, setAuditTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));

  // Audit State
  const [answers, setAnswers] = useState<Record<string, AuditItem>>({});
  const [activeSection, setActiveSection] = useState<number>(1);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Signature State
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [currentSigner, setCurrentSigner] = useState<'manager' | 'auditor' | null>(null);
  const [managerSignature, setManagerSignature] = useState<string>('');
  const [auditorSignature, setAuditorSignature] = useState<string>('');

  const generateFolio = () => {
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');
    // Generate 4 random digits
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    return `AB-${dateStr}-${randomSuffix}`;
  };

  useEffect(() => {
    const loadMasterData = async () => {
      const s = await StorageService.getStores();
      const p = await StorageService.getPeople();
      setStores(s);
      setPeople(p);
    };
    loadMasterData();
    setFolio(generateFolio());
  }, []);

  // --- Derived State for Progress & Validation ---

  const totalQuestions = useMemo(() => {
    return AUDIT_SECTIONS.reduce((acc, section) => acc + section.questions.length, 0);
  }, []);

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter((a: AuditItem) => a.score > 0).length;
  }, [answers]);

  const progressPercentage = Math.round((answeredCount / totalQuestions) * 100);

  const getSectionStatus = (sectionId: number) => {
    const section = AUDIT_SECTIONS.find(s => s.id === sectionId);
    if (!section) return 'pending';
    
    const questions = section.questions;
    const answeredInSec = questions.filter(q => {
      const item = answers[q.id] as AuditItem | undefined;
      return item && item.score > 0;
    }).length;
    
    if (answeredInSec === questions.length) return 'completed';
    if (showValidationErrors && answeredInSec < questions.length) return 'error';
    return 'pending';
  };

  // -----------------------------------------------

  const handleScore = (questionId: string, score: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        questionId,
        score,
        observation: prev[questionId]?.observation || ''
      }
    }));
  };

  const handleObservation = (questionId: string, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        questionId,
        score: prev[questionId]?.score || 0,
        observation: text
      }
    }));
  };

  const calculateTotal = () => {
    return (Object.values(answers) as AuditItem[]).reduce((acc, curr) => acc + curr.score, 0);
  };

  const validate = () => {
    let isValid = true;
    let firstErrorSection = 0;

    // 1. Check Header
    if (!selectedStore || !selectedManager || !selectedAuditor) {
      alert("Por favor complete los datos del encabezado (Tienda, Gerente, Auditor).");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }

    // 2. Check Questions
    for (const section of AUDIT_SECTIONS) {
      for (const q of section.questions) {
        if (!answers[q.id] || answers[q.id].score === 0) {
          isValid = false;
          if (firstErrorSection === 0) firstErrorSection = section.id;
        }
      }
    }

    if (!isValid) {
      setShowValidationErrors(true);
      if (firstErrorSection > 0) {
        setActiveSection(firstErrorSection);
      }
    }

    return isValid;
  };

  const initiateFinishProcess = async () => {
    if (!validate()) return;
    // Start Signature Process
    setManagerSignature('');
    setAuditorSignature('');
    setCurrentSigner('manager');
    setShowSignaturePad(true);
  };

  const handleSignatureSave = (signatureData: string) => {
    if (currentSigner === 'manager') {
      setManagerSignature(signatureData);
      // Changing the state here will cause a re-render.
      // Because SignaturePad has key={currentSigner}, React will discard the old instance 
      // and mount a brand new clean one for the auditor.
      setCurrentSigner('auditor'); 
    } else if (currentSigner === 'auditor') {
      setAuditorSignature(signatureData);
      setShowSignaturePad(false);
      setCurrentSigner(null);
      // Proceed to finalize with the just-captured signature
      submitAudit(managerSignature, signatureData); 
    }
  };

  const handleSignatureCancel = () => {
    setShowSignaturePad(false);
    setCurrentSigner(null);
  };

  const submitAudit = async (finalManagerSig: string, finalAuditorSig: string) => {
    setIsSubmitting(true);
    const totalScore = calculateTotal();
    let status: AuditRecord['status'] = 'CRITICO';
    if (totalScore >= 95) status = 'TIENDA_MODELO';
    else if (totalScore >= 85) status = 'ACEPTABLE';

    const storeName = stores.find(s => s.id === selectedStore)?.name || '';
    const managerName = people.find(p => p.id === selectedManager)?.name || '';
    const auditorName = people.find(p => p.id === selectedAuditor)?.name || '';

    const newAudit: AuditRecord = {
      id: '',
      folio: folio,
      storeName,
      managerName,
      auditorName,
      storeId: selectedStore,
      managerId: selectedManager,
      auditorId: selectedAuditor,
      date: auditDate,
      time: auditTime,
      items: answers,
      totalScore,
      status,
      managerSignature: finalManagerSig,
      auditorSignature: finalAuditorSig
    };

    await onFinish(newAudit);
    setIsSubmitting(false);
  };

  const getSignerName = () => {
    if (currentSigner === 'manager') {
      return people.find(p => p.id === selectedManager)?.name || 'Gerente';
    }
    if (currentSigner === 'auditor') {
      return people.find(p => p.id === selectedAuditor)?.name || 'Auditor';
    }
    return '';
  };

  return (
    <div className="max-w-3xl mx-auto pb-24 relative">
      
      {/* Progress Bar (Sticky) */}
      <div className="sticky top-0 z-40 bg-gray-50 pt-2 pb-2 mb-2 px-1">
        <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1 px-1">
           <span>Progreso de Auditoría</span>
           <span>{progressPercentage}% ({answeredCount}/{totalQuestions})</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 shadow-inner">
          <div 
            className="bg-green-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Header Info */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border-l-4 border-blue-900 mx-1 md:mx-0">
        <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
          <span className="mr-2">📋</span> Datos Generales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs uppercase font-bold text-gray-500">Folio</label>
            <div className="mt-1 block w-full rounded-md border-gray-300 bg-blue-50 p-2 border font-mono font-bold text-blue-900 tracking-wider">
              {folio}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tienda <span className="text-red-500">*</span></label>
            <select 
              className={`mt-1 block w-full rounded-md shadow-sm p-2 border ${!selectedStore && showValidationErrors ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} bg-white`}
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
            >
              <option value="">Seleccione Tienda...</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha y Hora</label>
            <div className="flex gap-2">
              <input 
                type="date" 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-white"
                value={auditDate}
                onChange={(e) => setAuditDate(e.target.value)}
              />
              <input 
                type="time" 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-white"
                value={auditTime}
                onChange={(e) => setAuditTime(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Gerente <span className="text-red-500">*</span></label>
            <select 
              className={`mt-1 block w-full rounded-md shadow-sm p-2 border ${!selectedManager && showValidationErrors ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} bg-white`}
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
            >
              <option value="">Seleccione Gerente...</option>
              {people.filter(p => p.role === 'Gerente').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Auditor <span className="text-red-500">*</span></label>
            <select 
              className={`mt-1 block w-full rounded-md shadow-sm p-2 border ${!selectedAuditor && showValidationErrors ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} bg-white`}
              value={selectedAuditor}
              onChange={(e) => setSelectedAuditor(e.target.value)}
            >
              <option value="">Seleccione Auditor...</option>
              {people.filter(p => p.role === 'Auditor').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Sections Navigation */}
      <div className="flex overflow-x-auto gap-2 mb-4 pb-2 md:pb-0 px-1 md:px-0 no-scrollbar">
        {AUDIT_SECTIONS.map(section => {
          const status = getSectionStatus(section.id);
          const isActive = activeSection === section.id;
          
          let statusClasses = 'bg-white text-gray-500 border-gray-200'; // Pending
          let icon = <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] flex items-center justify-center font-mono mr-2">{section.id}</span>;

          if (isActive) {
            statusClasses = 'bg-blue-900 text-white border-blue-900 shadow-md transform scale-105';
            icon = <span className="w-4 h-4 rounded-full bg-blue-700 text-white text-[10px] flex items-center justify-center font-mono mr-2">{section.id}</span>;
          } else if (status === 'completed') {
            statusClasses = 'bg-green-50 text-green-700 border-green-200';
            icon = <span className="mr-2 text-green-600 font-bold">✓</span>;
          } else if (status === 'error') {
            statusClasses = 'bg-red-50 text-red-600 border-red-300 animate-pulse';
            icon = <span className="mr-2 text-red-600 font-bold">!</span>;
          }

          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`whitespace-nowrap px-4 py-3 rounded-xl text-sm font-medium transition-all border flex items-center ${statusClasses}`}
            >
              {icon}
              {section.title.split(' ')[0]}...
            </button>
          );
        })}
      </div>

      {/* Questions Area */}
      <div className="space-y-6 mx-1 md:mx-0">
        {AUDIT_SECTIONS.filter(s => s.id === activeSection).map(section => (
          <div key={section.id} className="animate-fade-in-up">
            <div className="bg-blue-900 px-4 py-3 rounded-t-lg shadow-sm flex justify-between items-center">
              <h3 className="font-bold text-white text-lg">{section.id}. {section.title}</h3>
              <span className="text-xs bg-blue-800 text-blue-100 px-2 py-1 rounded">Max: {section.maxPoints} pts</span>
            </div>
            
            <div className="bg-white rounded-b-lg shadow-sm border border-t-0 border-gray-200 divide-y divide-gray-100">
              {section.questions.map(q => {
                const currentScore = answers[q.id]?.score;
                const isError = showValidationErrors && !currentScore;

                return (
                  <div key={q.id} className={`p-4 transition-colors ${isError ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="font-bold text-gray-400 text-xs mr-2 border border-gray-200 px-1 rounded">{q.id}</span>
                          <span className={`font-semibold ${isError ? 'text-red-700' : 'text-gray-800'}`}>
                            {q.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-8">{q.criterion}</p>
                      </div>
                      {isError && (
                        <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-1 rounded ml-2 whitespace-nowrap">
                          Requerido
                        </span>
                      )}
                    </div>
                    
                    {/* Scoring Buttons */}
                    <div className={`grid grid-cols-3 gap-2 my-3 p-2 rounded-lg ${isError ? 'bg-red-100/50 border border-red-200' : ''}`}>
                      {q.options.map(opt => {
                         const isSelected = currentScore === opt.value;
                         return (
                          <button
                            key={opt.label}
                            onClick={() => handleScore(q.id, opt.value)}
                            className={`py-3 px-1 rounded-md text-sm font-bold flex flex-col items-center justify-center border transition-all duration-200
                              ${isSelected
                                ? `${opt.color} text-white shadow-lg scale-[1.02] border-transparent ring-2 ring-offset-2 ring-gray-300` 
                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                              }`}
                          >
                            <span className="mb-0.5">{opt.label}</span>
                            <span className={`text-[10px] font-normal ${isSelected ? 'text-white/90' : 'text-gray-400'}`}>{opt.value} pts</span>
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Observation Input */}
                    <div className="ml-1">
                      <input
                        type="text"
                        placeholder="📝 Agregar observación..."
                        className="w-full text-sm border-gray-300 rounded-md border-0 border-b-2 bg-transparent p-2 focus:ring-0 focus:border-blue-500 transition-colors placeholder-gray-400"
                        value={answers[q.id]?.observation || ''}
                        onChange={(e) => handleObservation(q.id, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Footer Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex justify-between items-center z-40">
        <div className="flex flex-col">
           <span className="text-xs text-gray-500 uppercase font-bold tracking-wide">Total</span>
           <span className="font-black text-2xl text-blue-900 leading-none">{calculateTotal()} <span className="text-sm font-medium text-gray-400">/ 100</span></span>
        </div>
        
        <div className="flex gap-3 items-center">
          <button 
            onClick={onCancel}
            disabled={isSubmitting}
            className="hidden md:block px-4 py-2 text-gray-600 font-medium hover:text-gray-800 disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <div className="flex flex-col items-end">
            {showValidationErrors && totalQuestions - answeredCount > 0 && (
               <span className="text-xs text-red-600 font-bold mb-1 animate-pulse">
                 Faltan {totalQuestions - answeredCount} respuestas
               </span>
            )}
            <button 
              onClick={initiateFinishProcess}
              disabled={isSubmitting}
              className={`
                px-6 py-3 rounded-lg font-bold shadow-lg transition-all flex items-center
                ${isSubmitting ? 'bg-gray-400 cursor-wait' : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white'}
              `}
            >
              {isSubmitting ? 'Guardando...' : 'Firmar y Finalizar'}
            </button>
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignaturePad && (
        <SignaturePad 
          key={currentSigner} // FORCE RE-RENDER TO CLEAR CANVAS ON SIGNER CHANGE
          title={`Firma de ${currentSigner === 'manager' ? 'Encargado' : 'Auditor'}: ${getSignerName()}`}
          onSave={handleSignatureSave}
          onCancel={handleSignatureCancel}
        />
      )}
    </div>
  );
};

export default AuditForm;