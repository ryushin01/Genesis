// StyleX가 소스의 stylex.create·defineVars·createTheme에서 뽑은 CSS를 globals.css의 @stylex 자리에 넣습니다.
// 코드 변환(next.config.ts의 babel-loader 규칙)과 같은 옵션을 써야 클래스 이름이 맞습니다.
import { babelOptions } from './stylex.config.mjs';

const config = {
  plugins: {
    '@stylexjs/postcss-plugin': {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.stories.tsx'],
      babelConfig: babelOptions,
      useCSSLayers: true,
    },
  },
};

export default config;
