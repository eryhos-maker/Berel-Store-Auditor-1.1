import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Usamos process.env que está siendo reemplazado por Vite en tiempo de compilación.
// Es crucial acceder a la propiedad específica (ej. process.env.VITE_SUPABASE_URL)
// para que el mecanismo de 'define' de Vite funcione correctamente.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

// Verificación robusta: Aseguramos que las variables sean strings y no estén vacías
if (typeof SUPABASE_URL === 'string' && SUPABASE_URL.length > 0 && 
    typeof SUPABASE_KEY === 'string' && SUPABASE_KEY.length > 0 &&
    SUPABASE_KEY !== 'undefined') {
  try {
    client = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (error) {
    console.error("Error initializing Supabase Client:", error);
    client = null;
  }
} else {
  // Solo advertimos en consola, no detenemos la app. 
  // La app funcionará en modo "Offline" usando los datos mockeados en constants.ts
  console.log('Modo Offline: Supabase URL o Key no configurados.');
}

export const supabase = client;