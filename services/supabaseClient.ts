import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Usamos process.env que está siendo reemplazado por Vite en tiempo de compilación.
// Agregamos .trim() para limpiar espacios accidentales al copiar/pegar las llaves.
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();

let client: SupabaseClient | null = null;

// Verificación robusta
if (SUPABASE_URL && SUPABASE_KEY && 
    SUPABASE_URL !== 'undefined' && SUPABASE_KEY !== 'undefined') {
  try {
    client = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (error) {
    console.error("Error initializing Supabase Client:", error);
    client = null;
  }
} else {
  // Mensaje de depuración claro para el navegador
  console.warn('Modo Offline activado. Estado de variables:', {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_KEY,
    urlLength: SUPABASE_URL?.length
  });
}

export const supabase = client;