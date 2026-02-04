import { GoogleGenAI } from "@google/genai";
import { AuditRecord } from '../types';
import { AUDIT_SECTIONS } from '../constants';

// We initialize the client lazily inside the function to prevent crashes 
// if the API Key is missing at app startup.

export const generateActionPlan = async (audit: AuditRecord): Promise<string> => {
  try {
    // 1. Obtain API Key from environment variables
    const apiKey = process.env.API_KEY;
    
    // 2. Validate existence
    if (!apiKey) {
      console.warn("Gemini API Key is missing in environment variables.");
      return "El servicio de Inteligencia Artificial no está configurado (Falta API Key). Por favor redacte el plan manualmente.";
    }

    // 3. Initialize Client
    const ai = new GoogleGenAI({ apiKey });

    // 4. Prepare & Prioritize Findings
    interface Finding {
      text: string;
      percentage: number;
      hasObservation: boolean;
    }

    const findingsList: Finding[] = [];
    
    AUDIT_SECTIONS.forEach(section => {
      section.questions.forEach(q => {
        const item = audit.items[q.id];
        // Filter items that did not achieve max points
        if (item && item.score < q.maxPoints) { 
           const percentage = item.score / q.maxPoints;
           const hasObservation = !!(item.observation && item.observation.trim().length > 0);
           
           // Determine severity label
           let severityTag = '[MEJORABLE]';
           if (percentage <= 0.5) severityTag = '[CRÍTICO]';
           else if (percentage <= 0.75) severityTag = '[ALERTA]';

           // Flag missing observations explicitly for the AI
           const obsText = hasObservation ? item.observation : "⚠️ EL AUDITOR NO REGISTRÓ OBSERVACIÓN (Investigar causa raíz)";

           findingsList.push({
             text: `${severityTag} ${q.category}: ${q.criterion} (Obtenido: ${item.score}/${q.maxPoints}). Detalle: ${obsText}`,
             percentage: percentage,
             hasObservation: hasObservation
           });
        }
      });
    });

    // Handle perfect score case
    if (findingsList.length === 0) {
      return "¡Excelente ejecución! La tienda cumple con todos los estándares operativos evaluados. Se recomienda reconocer al personal y mantener la supervisión actual para asegurar la consistencia.";
    }

    // SORTING LOGIC:
    // 1. Items with <= 50% score come first (Critical).
    // 2. Then items sorted by lowest percentage.
    // 3. Within same percentage, prioritize items missing observations (as they are process failures).
    findingsList.sort((a, b) => {
      if (a.percentage !== b.percentage) {
        return a.percentage - b.percentage; // Ascending: lower score first
      }
      // If percentages are equal, put the one missing observation first to highlight the gap
      return (a.hasObservation === b.hasObservation) ? 0 : a.hasObservation ? 1 : -1;
    });

    // 5. Construct Prompt
    const prompt = `
      Genera un Plan de Acción Correctivo, conciso y directo para la tienda: "${audit.storeName}".
      
      Datos Generales:
      - Calificación Total: ${audit.totalScore}/100
      - Estatus Global: ${audit.status}
      
      LISTA DE HALLAZGOS (Ordenados por prioridad/gravedad):
      ${findingsList.map(f => f.text).join('\n')}

      Instrucciones Específicas:
      1. Analiza primero los puntos marcados como [CRÍTICO] y [ALERTA]. Son la prioridad absoluta.
      2. Si un hallazgo dice "⚠️ EL AUDITOR NO REGISTRÓ OBSERVACIÓN", incluye en el plan una acción para validar por qué falló ese punto, ya que no hay datos claros.
      3. Genera de 3 a 5 acciones correctivas agrupadas por urgencia.
      4. Usa lenguaje imperativo y motivador (Ej: "Implementar...", "Corregir...", "Asegurar...").
      5. No uses markdown complejo (como negritas excesivas), usa viñetas simples.
      6. Enfócate en la solución operativa, no en la teoría.
    `;

    // 6. Generate Content
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Eres un Gerente Regional de Operaciones de Berel. Eres estricto con los estándares de marca pero constructivo. Tu objetivo es levantar la calificación de la tienda inmediatamente.",
        temperature: 0.5, // Lower temperature for more focused/deterministic plans
      }
    });

    return response.text || "No se pudo generar el plan de acción automáticamente.";

  } catch (error) {
    console.error("Error generating action plan:", error);
    return "Ocurrió un error de conexión con el servicio de IA. Intente generar el plan nuevamente.";
  }
};