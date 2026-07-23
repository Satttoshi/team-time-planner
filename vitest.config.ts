import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test-utils/**',
        // Next.js glue (pages, layouts, API route handlers) — covered by e2e, not unit tests
        'src/app/**',
        // Tiptap-based collaborative editor UI — depends on contenteditable/ProseMirror,
        // which jsdom cannot meaningfully exercise
        'src/components/match-planner/**',
        // Thin wrapper around Swiper's DOM/touch engine — not meaningful in jsdom
        'src/components/SwiperContainer.tsx',
        // Database connection bootstrap (requires live DATABASE_URL)
        'src/lib/db/index.ts',
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
});
