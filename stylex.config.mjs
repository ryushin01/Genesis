/*
 * StyleX 컴파일 옵션(한 곳). Next(Turbopack의 babel-loader 규칙·PostCSS 플러그인)와 Storybook·Vitest(unplugin)가
 * 같은 값을 써야 토큰(defineVars) 변수 이름과 클래스 이름이 서로 맞습니다.
 * Babel 설정 파일(.babelrc, babel.config.*)은 두지 않습니다. 두면 Storybook의 react-docgen과 unplugin도 그 설정을 읽어
 * 타입스크립트를 못 읽거나 StyleX 변환을 두 번 합니다.
 */
import path from 'node:path';

// Turbopack은 PostCSS 설정을 가상 경로(/ROOT)에서 실행하므로 __dirname 대신 명령을 실행한 폴더(저장소 맨 위)를 씁니다.
const rootDir = process.cwd();

/**
 * 테마 파일(*.stylex.ts)을 찾는 방식. 변수 이름은 파일 경로로 정해집니다.
 * @type {{ type: 'commonJS', rootDir: string }}
 */
const moduleResolution = { type: 'commonJS', rootDir };

const stylexOptions = {
  // 개발 서버에서도 운영과 같은 클래스 이름을 씁니다.
  dev: false,
  // 스타일은 빌드할 때 CSS 파일로 뽑아내고, 실행 중에 <style>을 넣지 않습니다.
  runtimeInjection: false,
  enableInlinedConditionalMerge: true,
  treeshakeCompensation: true,
  // tsconfig의 @/* → src/*
  aliases: { '@/*': [path.join(rootDir, 'src/*')] },
  unstable_moduleResolution: moduleResolution,
};

/** stylex.create 등을 클래스 이름으로 바꾸는 Babel 옵션(다른 변환은 하지 않음, 타입스크립트·JSX는 그대로 둠). */
const babelOptions = {
  babelrc: false,
  configFile: false,
  parserOpts: { plugins: ['typescript', 'jsx'] },
  plugins: [['@stylexjs/babel-plugin', stylexOptions]],
};

export { babelOptions, stylexOptions };
