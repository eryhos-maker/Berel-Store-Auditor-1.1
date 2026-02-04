import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga las variables de entorno desde el archivo .env (si existe)
  // En producción (Vercel/Netlify), estas variables se inyectan desde el panel de control,
  // por lo que 'loadEnv' devolverá un objeto con esas claves aunque no exista el archivo .env.local
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // IMPORTANTE: Usar '/' en lugar de './' para producción en Vercel/Netlify/Firebase
    // Esto asegura que los assets se carguen desde la raíz del dominio, evitando errores 404 en subrutas.
    base: '/', 
    build: {
      outDir: 'dist', // Ensure explicit output directory
    },
    define: {
      // Polyfill seguro para process.env.
      // 1. Definimos 'process.env' como un objeto vacío para evitar "ReferenceError: process is not defined"
      'process.env': {},
      // 2. Reemplazamos explícitamente las variables que necesitamos.
      // JSON.stringify asegura que el valor se inserte como un string literal en el bundle final.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
    }
  };
});