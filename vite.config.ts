import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga variables del archivo .env local si existe
  const env = loadEnv(mode, (process as any).cwd(), '');

  // 1. Definimos las variables con prioridad
  const apiKey = process.env.API_KEY || env.API_KEY || '';
  
  // Usamos los datos de Supabase proporcionados
  const supabaseUrl = 'https://xnzjsogdymsaefjxeeby.supabase.co';
  const supabaseKey = 'sb_publishable_1ZnmuRAcVix0WWoU4KQ1tg_W0HLLVAr';

  return {
    plugins: [react()],
    base: '/', 
    build: {
      outDir: 'dist',
    },
    define: {
      'process.env': {},
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
    }
  };
});