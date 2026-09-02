import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['web/src/test-setup.ts'],
    include: ['server/**/*.test.ts', 'test/**/*.test.ts', 'web/**/*.test.{ts,tsx}'],
    environmentMatchGlobs: [['web/**', 'jsdom']],
  },
});
