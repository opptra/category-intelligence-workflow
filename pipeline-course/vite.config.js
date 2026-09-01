import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    fs: {
      allow: [path.resolve(__dirname, '..')]
    }
  },
  resolve: {
    alias: {
      '@sample': path.resolve(__dirname, '../sample_data.json')
    }
  }
});
