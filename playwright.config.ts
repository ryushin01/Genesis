import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // WebGL 장면을 소프트웨어로 그리므로 동시에 돌리면 서로 프레임을 빼앗습니다.
  workers: 1,
  timeout: 90_000,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3210', trace: 'retain-on-failure' },
  webServer: {
    command: 'pnpm build && pnpm start -p 3210',
    url: 'http://localhost:3210',
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
