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

    // 4. Prepare Context (Failed Items)
    const failedItems: string[] = [];
    
    AUDIT_SECTIONS.forEach(section => {
      section.questions.forEach(q => {
        const item = audit.items[q.id];
        // Filter items that did not achieve max points
        if (item && item.score < q.maxPoints) { 
           failedItems.push(`- ${q.category}: ${q.criterion} (Puntaje: ${item.score}/${q.maxPoints}). Obs: ${item.observation || 'Ninguna'}`);
        }
      });
    });

    // Handle perfect score case
    if (failedItems.length === 0) {
      return "¡Excelente ejecución! La tienda cumple con todos los estándares operativos evaluados. Se recomienda reconocer al personal y mantener la supervisión actual para asegurar la consistencia.";
    }

    // 5. Construct Prompt
    const prompt = `
      Genera un Plan de Acción Correctivo para la tienda: "${audit.storeName}".
      
      Contexto de Auditoría:
      - Calificación Total: ${audit.totalScore}/100
      - Estatus: ${audit.status}
      
      Hallazgos Detectados (Áreas de Oportunidad):
      ${failedItems.join('\n')}

      Instrucciones de respuesta:
      1. Proporciona de 3 a 5 acciones concretas y prioritarias para corregir los hallazgos.
      2. Usa un lenguaje directivo, profesional y motivador.
      3. Sé conciso. Ve directo al grano.
      4. Formato: Lista simple o viñetas (sin markdown complejo).
    `;

    // 6. Generate Content using the specific model and config
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Eres un consultor experto en operaciones de retail y auditoría para tiendas de pintura Berel. Tu objetivo es proporcionar planes de acción claros, ejecutables y orientados a resultados inmediatos.",
        temperature: 0.7, // Balanced creativity and precision
      }
    });

    return response.text || "No se pudo generar el plan de acción automáticamente.";

  } catch (error) {
    console.error("Error generating action plan:", error);
    return "Ocurrió un error de conexión con el servicio de IA. Por favor verifique su conexión a internet e intente nuevamente.";
  }
};