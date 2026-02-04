import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    base: '/', // Asegura rutas absolutas para SPA
    define: {
      // Polyfill process.env.API_KEY for the Google GenAI SDK
      // This allows 'process.env.API_KEY' usage in the browser code
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});