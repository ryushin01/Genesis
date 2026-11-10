import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: ["../src/**/*.stories.tsx"],
  // 앱과 함께 배포할 때(STORYBOOK_IN_APP=1)는 public을 복사하지 않습니다. 같은 주소의 파일을 그대로 씁니다.
  viteFinal: (viteConfig) =>
    process.env.STORYBOOK_IN_APP
      ? { ...viteConfig, publicDir: false }
      : viteConfig,
};

export default config;
