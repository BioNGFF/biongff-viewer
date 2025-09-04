import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // outDir: path.resolve(__dirname, '../dist'),
    lib: {
      entry: path.resolve(__dirname, 'src/index.js'),
      name: 'BiongffViewer',
      formats: ['es', 'cjs'],
      fileName: (format) => `biongff-viewer.${format}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
