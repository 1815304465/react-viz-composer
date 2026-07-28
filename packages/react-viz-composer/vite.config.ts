import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'charts/index': resolve(__dirname, 'src/charts/index.ts'),
        'charts/shared/mockData': resolve(__dirname, 'src/charts/shared/mockData.ts'),
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'lodash-es',
      ],
      output: {
        exports: 'named',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'lodash-es': '_',
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
