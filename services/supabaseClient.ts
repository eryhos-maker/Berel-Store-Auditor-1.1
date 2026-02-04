import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Usamos process.env que ahora está "polifilleado" en vite.config.ts
// Esto garantiza que el proceso de build reemplace estas variables con cadenas de texto,
// previniendo errores "Cannot read properties of undefined" relacionados con import.meta.env.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xnzjsogdymsaefjxeeby.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1ZnmuRAcVix0WWoU4KQ1tg_W0HLLVAr';

let client: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY && SUPABASE_KEY !== 'undefined') {
  try {
    client = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (error) {
    console.error("Error initializing Supabase Client:", error);
    client = null;
  }
} else {
  console.warn('Supabase URL or Key is missing. The app will run in Offline/Mock mode.');
}

export const supabase = client;