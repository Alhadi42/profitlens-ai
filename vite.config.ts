import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // @ts-ignore
        allowedHosts: process.env.TEMPO === "true" ? true : undefined
      },
      plugins: [react()],
      define: {
        'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              charts: ['chart.js'],
              supabase: ['@supabase/supabase-js'],
              ai: ['@google/genai']
            }
          }
        }
      }
    };
});