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
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,stories}.{ts,tsx}'],
      // text: 터미널, json-summary: CI 요약 표(scripts/coverage-summary.mjs), html: 실패할 때 올리는 리포트
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        // 전체: 기준선(1.3.2 측정값의 내림)보다 내려가면 실패합니다. 테스트를 더해 올라가면 함께 올립니다.
        statements: 53,
        branches: 54,
        functions: 61,
        lines: 52,
        // 로직 계층(공용 로직, 모델, API, 장면 모델 받기·진행률)은 80% 이상.
        ...Object.fromEntries(
          ['src/shared/lib/**', 'src/**/model/**', 'src/**/api/**', 'src/_pages/intro/lib/fetchModel.ts'].map((glob) => [
            glob,
            { statements: 80, branches: 80, functions: 80, lines: 80 },
          ]),
        ),
      },
    },
  },
});
