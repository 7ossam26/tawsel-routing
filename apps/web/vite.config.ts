import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import {
  parseHttpUrl,
  requireConfigurationValue
} from '@tawsel/shared';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, '../../', 'VITE_');
  parseHttpUrl(
    requireConfigurationValue(environment, 'VITE_TAWSEL_API_BASE_URL'),
    'VITE_TAWSEL_API_BASE_URL'
  );

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: { '/api': { target: requireConfigurationValue(environment, 'VITE_TAWSEL_API_BASE_URL'), changeOrigin: false } }
    },
    preview: {
      port: 4173,
      strictPort: true
    }
  };
});
