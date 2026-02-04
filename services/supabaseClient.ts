import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use environment variables for production security.
// Fallback values are kept only for local dev convenience if .env is missing, 
// but should be configured in your deployment settings (Vercel/Netlify).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xnzjsogdymsaefjxeeby.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1ZnmuRAcVix0WWoU4KQ1tg_W0HLLVAr';

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