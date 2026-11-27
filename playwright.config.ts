import { defineConfig, devices } from '@playwright/test';

/** 같은 기기의 다른 앱이 3210을 쓰고 있으면 E2E_PORT로 바꿉니다(예: E2E_PORT=3290 pnpm e2e). */
const port = Number(process.env.E2E_PORT ?? 3210);

/**
 * 배포한 사이트에 검사를 돌릴 때의 주소. `pnpm e2e:deployed`는 운영 주소를 기본으로 쓰고, `E2E_BASE_URL`로 바꿉니다.
 * 이때는 로컬 서버를 띄우지 않습니다. 환경 변수 대신 스크립트 이름으로 판단해 Windows에서도 동작합니다.
 */
const deployed =
  process.env.E2E_BASE_URL ?? (process.env.npm_lifecycle_event === 'e2e:deployed' ? 'https://zero.ryushin0.co.kr' : undefined);

export default defineConfig({
  testDir: './e2e',
  // WebGL 장면을 소프트웨어로 그리므로 동시에 돌리면 서로 프레임을 빼앗습니다.
  workers: 1,
  timeout: 90_000,
  reporter: 'list',
  use: { baseURL: deployed ?? `http://localhost:${port}`, trace: 'retain-on-failure' },
  webServer: deployed
    ? undefined
    : {
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
