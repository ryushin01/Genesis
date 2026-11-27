import { defineConfig, devices, type Project } from '@playwright/test';

/** 같은 기기의 다른 앱이 3210을 쓰고 있으면 E2E_PORT로 바꿉니다(예: E2E_PORT=3290 pnpm e2e). */
const port = Number(process.env.E2E_PORT ?? 3210);

/**
 * 배포한 사이트에 검사를 돌릴 때의 주소. `pnpm e2e:deployed`는 운영 주소를 기본으로 쓰고, `E2E_BASE_URL`로 바꿉니다.
 * 이때는 로컬 서버를 띄우지 않습니다. 환경 변수 대신 스크립트 이름으로 판단해 Windows에서도 동작합니다.
 */
const deployed =
  process.env.E2E_BASE_URL ?? (process.env.npm_lifecycle_event === 'e2e:deployed' ? 'https://zero.ryushin0.co.kr' : undefined);

/**
 * 이미 만든 프로덕션 빌드를 다시 쓸지. `pnpm check`(CI)는 한 번 빌드한 결과를 E2E·크기·Lighthouse가 함께 쓰도록 켭니다.
 * 끄면(`pnpm e2e`) 예전처럼 빌드부터 합니다.
 */
const prebuilt = process.env.E2E_PREBUILT === '1';

/**
 * 시각 회귀 기준 이미지는 Linux(CI)에서 만든 것이라, Linux이거나 Docker 안의 브라우저(`pnpm visual:docker`가 띄우는
 * Playwright 공식 이미지의 run-server)에 붙을 때만 비교합니다. macOS·Windows에서 그냥 돌리면 시각 검사는 건너뜁니다.
 */
const visualEndpoint = process.env.VISUAL_WS_ENDPOINT;
const visualEnabled = process.platform === 'linux' || Boolean(visualEndpoint);

const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } };
const mobile = devices['Pixel 7'];
const VISUAL = /visual\.spec\.ts$/;

const visualProject = (name: 'desktop' | 'mobile', device: typeof desktop): Project => ({
  name: `visual-${name}`,
  testMatch: VISUAL,
  // 브라우저가 가끔 화면을 찍지 못하는 일(Page.captureScreenshot 프로토콜 오류)이 있어 한 번 다시 돌립니다. 통과하려면 여전히 픽셀이 모두 같아야 합니다.
  retries: 1,
  snapshotPathTemplate: '{testDir}/__screenshots__/' + name + '/{arg}{ext}',
  expect: {
    // 다른 픽셀이 하나라도 있으면 실패합니다(StyleX 전환 때 쓴 기준과 같음).
    toHaveScreenshot: { maxDiffPixels: 0, threshold: 0, animations: 'disabled', caret: 'hide', timeout: 30_000 },
  },
  use: {
    ...device,
    // Docker 안의 브라우저가 이 기기의 localhost(E2E 서버)에 닿도록 루프백을 넘깁니다.
    ...(visualEndpoint ? { connectOptions: { wsEndpoint: visualEndpoint, exposeNetwork: '<loopback>' } } : {}),
  },
});

export default defineConfig({
  testDir: './e2e',
  // WebGL 장면을 소프트웨어로 그리므로 동시에 돌리면 서로 프레임을 빼앗습니다.
  workers: 1,
  timeout: 90_000,
  // CI에서는 실패했을 때 올릴 HTML 리포트(차이 이미지·트레이스 포함)도 만듭니다.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: deployed ?? `http://localhost:${port}`, trace: 'retain-on-failure' },
  webServer: deployed
    ? undefined
    : {
        command: prebuilt ? `pnpm start -p ${port}` : `pnpm build && pnpm start -p ${port}`,
        url: `http://localhost:${port}`,
        timeout: 240_000,
        reuseExistingServer: !process.env.CI,
      },
  projects: [
    { name: 'desktop', testIgnore: VISUAL, use: desktop },
    { name: 'mobile', testIgnore: VISUAL, use: mobile },
    ...(visualEnabled ? [visualProject('desktop', desktop), visualProject('mobile', mobile)] : []),
  ],
});
