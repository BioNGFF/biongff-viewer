import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      ...(mode === 'development'
        ? {
            '@biongff/viewer': path.resolve(
              __dirname,
              '../../viewer/src/index.js',
            ),
            '@biongff/anndata-zarr/dist/anndata-zarr.css': path.resolve(
              __dirname,
              '../../anndata-zarr/src/index.css',
            ),
            '@biongff/anndata-zarr': path.resolve(
              __dirname,
              '../../anndata-zarr/src/index.js',
            ),
          }
        : {}),
    },
  },
}));
