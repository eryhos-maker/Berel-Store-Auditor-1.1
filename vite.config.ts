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
      // Aumentamos el límite de advertencia a 1000kB (1MB) para silenciar la alerta de 500kB
      chunkSizeWarningLimit: 1000, 
      rollupOptions: {
        output: {
          // Dividimos las librerías pesadas en archivos separados para mejorar la carga
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'supabase-sdk': ['@supabase/supabase-js'],
            'google-genai': ['@google/genai']
          }
        }
      }
    },
    define: {
      'process.env': {},
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
    }
  };
});