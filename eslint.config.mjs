import next from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const config = [
  ...next,
  ...nextTs,
  { ignores: ['.next/**', 'storybook-static/**', 'public/storybook/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts'] },
  { rules: { '@next/next/no-html-link-for-pages': 'off' } },
  // eslint-config-next는 jsx-a11y 규칙을 몇 개만 켭니다. 플러그인은 이미 등록되어 있으니 recommended 규칙만 더합니다.
  { files: ['**/*.{jsx,tsx}'], rules: jsxA11y.flatConfigs.recommended.rules },
];

export default config;
