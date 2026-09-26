import {fileURLToPath} from 'node:url';

import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('./ui', import.meta.url)),
  plugins: [react()],
  build: {outDir: '../ui-dist', emptyOutDir: true},
});
