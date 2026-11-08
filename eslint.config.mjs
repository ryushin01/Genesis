import next from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...next,
  ...nextTs,
  { ignores: ['.next/**', 'storybook-static/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts'] },
  { rules: { '@next/next/no-html-link-for-pages': 'off' } },
];

export default config;
