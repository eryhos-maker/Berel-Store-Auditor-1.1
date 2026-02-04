import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration provided by the user
const SUPABASE_URL = 'https://xnzjsogdymsaefjxeeby.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1ZnmuRAcVix0WWoU4KQ1tg_W0HLLVAr';

let client: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY) {
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