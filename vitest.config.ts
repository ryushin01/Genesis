import path from 'node:path';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin';
import { stylexOptions } from './stylex.config.mjs';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // stylex.create 호출을 클래스 이름으로 바꿉니다(바꾸지 않으면 실행 중에 오류). 테스트는 CSS를 쓰지 않습니다.
  plugins: [stylex.vite({ ...stylexOptions, devMode: 'css-only' }), react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
