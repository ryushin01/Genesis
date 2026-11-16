import { defineConfig, devices } from '@playwright/test';

/** 같은 기기의 다른 앱이 3210을 쓰고 있으면 E2E_PORT로 바꿉니다(예: E2E_PORT=3290 pnpm e2e). */
const port = Number(process.env.E2E_PORT ?? 3210);

export default defineConfig({
  testDir: './e2e',
  // WebGL 장면을 소프트웨어로 그리므로 동시에 돌리면 서로 프레임을 빼앗습니다.
  workers: 1,
  timeout: 90_000,
  reporter: 'list',
  use: { baseURL: `http://localhost:${port}`, trace: 'retain-on-failure' },
  webServer: {
    command: `pnpm build && pnpm start -p ${port}`,
    url: `http://localhost:${port}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
