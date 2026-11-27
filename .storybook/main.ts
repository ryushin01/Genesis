import type { StorybookConfig } from "@storybook/nextjs-vite";
import stylex from "@stylexjs/unplugin";
import { stylexOptions } from "../stylex.config.mjs";

/** 앱과 함께 배포하는 빌드(pnpm build-storybook, pnpm build)인지. 환경 변수 대신 스크립트 이름으로 판단해 Windows에서도 동작합니다. */
const inApp = process.env.npm_lifecycle_event === "build-storybook";

/** 빌드에서는 unplugin이 CSS를 붙이므로, globals.css에 남는 @stylex 자리 표시만 지웁니다. */
const dropStylexDirective = {
  postcssPlugin: "drop-stylex-directive",
  AtRule: { stylex: (rule: { remove: () => void }) => rule.remove() },
};

const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: ["../src/**/*.stories.tsx"],
  // 접근성 패널(axe). 위반은 오류로 다루고(preview.ts의 a11y.test), CI에서는 e2e/storybook-a11y.spec.ts가 모든 스토리를 같은 axe로 검사합니다.
  addons: ["@storybook/addon-a11y"],
  // StyleX: 코드(stylex.create → 클래스 이름)는 unplugin이 바꿉니다. CSS는 빌드에서는 unplugin이 미리보기 CSS 끝에 붙이고,
  // 개발 서버(pnpm storybook)에서는 앱과 같은 PostCSS 설정이 globals.css의 @stylex 자리에 넣습니다(둘 다 쓰면 CSS가 두 번 들어감).
  // 앱과 함께 배포할 때(pnpm build-storybook)는 public을 복사하지 않습니다. 같은 주소의 파일을 그대로 씁니다.
  viteFinal: (viteConfig, { configType }) => ({
    ...viteConfig,
    ...(inApp ? { publicDir: false } : {}),
    ...(configType === "PRODUCTION" ? { css: { ...viteConfig.css, postcss: { plugins: [dropStylexDirective] } } } : {}),
    plugins: [
      stylex.vite({ ...stylexOptions, useCSSLayers: true, devMode: "css-only" }),
      ...(viteConfig.plugins ?? []),
    ],
  }),
};

export default config;
