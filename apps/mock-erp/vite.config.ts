import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({root:new URL('./ui',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),plugins:[react()],build:{outDir:'../ui-dist',emptyOutDir:true}});
