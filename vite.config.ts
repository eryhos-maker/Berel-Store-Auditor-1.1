import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    base: './', // Se usa ruta relativa para evitar 404 en subdirectorios
    define: {
      // Polyfill process.env para uso seguro en el cliente.
      // Se añade "|| ''" para asegurar que si la variable es undefined, se reemplace por un string vacío
      // en lugar de dejar un token indefinido que pueda causar ReferenceError.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
    }
  };
});