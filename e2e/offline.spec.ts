import { test as base, expect } from '@playwright/test';

/**
 * 오프라인 검사: localhost 밖으로 나가는 요청을 모두 끊은 상태에서도 주요 화면이 내용과 함께 뜨는지 봅니다.
 * 글꼴·3D 모델·Storybook은 저장소에 들어 있고, Sentry는 DSN이 없으면 번들에 넣지 않으므로 바깥 요청이 없어야 합니다.
 * `.env` 없이 만든 프로덕션 빌드(playwright.config.ts의 webServer)로 돌립니다.
 */
const test = base.extend<{ external: string[] }>({
  external: [
    async ({ context }, use) => {
      const external: string[] = [];
      await context.route('**/*', (route) => {
        const { hostname, protocol } = new URL(route.request().url());
        if (protocol === 'data:' || protocol === 'blob:' || hostname === 'localhost' || hostname === '127.0.0.1') {
          return route.continue();
        }
        external.push(route.request().url());
        return route.abort('internetdisconnected');
      });
      await use(external);
      expect(external, '바깥으로 나간 요청').toEqual([]);
    },
    { auto: true },
  ],
});

test.describe('오프라인', () => {
  test('인트로가 3D 장면과 메인 링크를 보여 준다', async ({ page, isMobile }) => {
    test.skip(isMobile, 'WebGL 장면은 데스크톱 한 번만 띄웁니다');
    await page.goto('/');
    // 3D 모델(public/models)을 받아 장면을 띄우면 정지 버튼이 나옵니다. CI에는 GPU가 없어 느립니다.
    await expect(page.getByRole('button', { name: '배경 애니메이션 정지' })).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('canvas')).toHaveCount(1);
    // 장면을 그리는 동안 클릭은 느린 기기에서 흔들리므로 링크 주소만 보고, 메인은 아래 테스트에서 직접 엽니다.
    await expect(page.getByRole('link', { name: '메인으로 들어가기' })).toHaveAttribute('href', '/main');
  });

  test('동작 줄이기 인트로는 장면 없이 모든 글을 보여 준다', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByText('SF 전쟁으로 이어진다.')).toBeVisible();
  });

  test('메인이 내용과 저장소 글꼴로 뜬다', async ({ page }) => {
    await page.goto('/main');
    await expect(page.getByRole('heading', { level: 1, name: /프로젝트 제로/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: '기록 보관소' })).toBeAttached();
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() =>
      [...document.fonts].filter((font) => font.status === 'loaded').map((font) => font.family),
    );
    expect(loaded.length, '받은 글꼴').toBeGreaterThan(0);
    // next/font가 만드는 `… Fallback` 항목은 시스템 글꼴(local('Arial') 등)을 가리켜 Linux CI에서는 없을 수 있으므로 뺍니다.
    const failed = await page.evaluate(() =>
      [...document.fonts]
        .filter((font) => font.status === 'error' && !/Fallback/.test(font.family))
        .map((font) => font.family),
    );
    expect(failed, '받지 못한 글꼴').toEqual([]);
  });

  test('함께 배포한 Storybook이 열린다', async ({ page, isMobile }) => {
    test.skip(isMobile, '데스크톱에서 한 번만 봅니다');
    const response = await page.goto('/storybook/index.html');
    expect(response?.status()).toBe(200);
    await expect(page.locator('#storybook-preview-iframe')).toBeAttached();
  });
});
