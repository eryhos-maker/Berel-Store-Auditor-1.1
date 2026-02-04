import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 1. Cargar variables desde archivos .env (para desarrollo local)
  const env = loadEnv(mode, (process as any).cwd(), '');

  // 2. Definir valores priorizando el entorno del sistema (Vercel) sobre el archivo .env
  // 'process.env.NOMBRE' tiene el valor real en Vercel.
  // 'env.NOMBRE' tiene el valor del archivo .env (que no existe en Vercel).
  const apiKey = process.env.API_KEY || env.API_KEY || '';
  const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';

  return {
    plugins: [react()],
    // IMPORTANTE: Usar '/' para producción
    base: '/', 
    build: {
      outDir: 'dist',
    },
    define: {
      // Polyfill seguro para process.env
      'process.env': {},
      // Inyectamos los valores resueltos explícitamente como strings JSON
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
    }
  };
});