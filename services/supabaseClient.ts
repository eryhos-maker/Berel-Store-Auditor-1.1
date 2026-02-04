import { createClient, SupabaseClient } from '@supabase/supabase-js';

// URL y Key proporcionadas explícitamente
const SUPABASE_URL = 'https://xnzjsogdymsaefjxeeby.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1ZnmuRAcVix0WWoU4KQ1tg_W0HLLVAr';

let client: SupabaseClient | null = null;

// Inicialización directa
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    client = createClient(SUPABASE_URL, SUPABASE_KEY);
    // Conexión establecida silenciosamente
  } catch (error) {
    console.error("Error crítico inicializando Supabase:", error);
    client = null;
  }
}

export const supabase = client;