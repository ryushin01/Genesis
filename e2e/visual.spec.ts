import { test, expect, type Page } from '@playwright/test';

/**
 * 시각 회귀 검사: 화면을 기준 이미지(`e2e/__screenshots__/<프로젝트>/`)와 픽셀 단위로 비교합니다.
 * WebGL 캔버스는 GPU·드라이버마다 그림이 달라 비교하지 않습니다(장면은 띄우지 않거나 캔버스를 숨김).
 * 기준 이미지는 Playwright 공식 Docker 이미지(linux/amd64)의 브라우저로 찍습니다. 만들고 고치는 법은 개발 가이드 '시각 회귀'.
 * 한 화면이 달라도 나머지를 계속 찍어(expect.soft) 한 번에 모든 차이를 봅니다.
 */

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.fonts].every((font) => font.status !== 'loading'));
  await page.waitForTimeout(600);
}

/**
 * 스크롤한 뒤 화면이 가라앉을 때까지 기다립니다. Chromium은 스크롤하는 동안 이미지(로고)를 낮은 품질로 줄여 그렸다가
 * 멈춘 뒤 다시 그리므로, 두 프레임과 한가한 때를 기다린 뒤 찍습니다.
 */
async function scrollTo(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => requestIdleCallback(() => resolve(), { timeout: 2000 })));
      }),
  );
  await page.waitForTimeout(800);
}

/** 메인 구역의 위치(구역 높이에서 화면 높이를 뺀 거리의 비율). */
function sectionAt(page: Page, id: string, ratio: number) {
  return page.evaluate(
    ([sectionId, r]) => {
      const section = document.getElementById(sectionId);
      if (!section) throw new Error(`#${sectionId}가 없습니다.`);
      return Math.round(section.offsetTop + (section.offsetHeight - window.innerHeight) * r);
    },
    [id, ratio] as const,
  );
}

test.describe('인트로(장면 없이 CSS 배경)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/models/**', (route) => route.abort());
    await page.goto('/');
    await page.locator('[data-scene="failed"]').waitFor();
    await settle(page);
  });

  test('구간별', async ({ page }) => {
    await expect.soft(page).toHaveScreenshot('intro-hero.png');
    for (const [name, ratio] of [
      ['myths', 0.45],
      ['entangled', 0.5],
      ['cosmos', 0.5],
      ['war', 0.55],
    ] as const) {
      const y = await page.evaluate(
        ([chapter, r]) => {
          const section = document.querySelector<HTMLElement>(`[data-chapter][data-name="${chapter}"]`);
          if (!section) throw new Error(`${chapter} 장이 없습니다.`);
          return section.offsetTop + section.offsetHeight * r;
        },
        [name, ratio] as const,
      );
      await scrollTo(page, y);
      await expect.soft(page).toHaveScreenshot(`intro-${name}.png`);
    }
    await scrollTo(page, 1e6);
    await expect.soft(page).toHaveScreenshot('intro-finale.png');
    await page.getByRole('link', { name: '메인으로 들어가기' }).hover();
    await page.waitForTimeout(400);
    await expect.soft(page).toHaveScreenshot('intro-finale-hover.png');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(400);
    await expect.soft(page).toHaveScreenshot('intro-finale-focus.png');
  });
});

test('인트로 동작 줄이기', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await settle(page);
  await expect.soft(page).toHaveScreenshot('intro-reduced.png', { fullPage: true });
});

test.describe('인트로 장면 상태(데스크톱)', () => {
  test.skip(({ isMobile }) => isMobile, '데스크톱에서만 봅니다');

  test('로딩 화면', async ({ page }) => {
    // 모델 요청을 붙잡아 두어 로딩 화면을 남깁니다.
    await page.route('**/models/**', () => new Promise(() => {}));
    await page.goto('/');
    await page.waitForFunction(() => document.fonts.status === 'loaded');
    await page.waitForTimeout(800);
    await expect.soft(page).toHaveScreenshot('intro-loader.png');
  });
});

test('메인', async ({ page }) => {
  await page.goto('/main');
  await settle(page);
  await expect.soft(page).toHaveScreenshot('main-hero.png');
  await scrollTo(page, Math.round(await page.evaluate(() => window.innerHeight * 0.5)));
  await expect.soft(page).toHaveScreenshot('main-hero-exit.png');
  for (const [id, ratio] of [
    ['prologue', 0.2],
    ['prologue', 0.5],
    ['structure', 0.15],
    ['structure', 0.5],
    ['structure', 0.85],
    ['archive', 0],
    ['archive', 1],
  ] as const) {
    await scrollTo(page, await sectionAt(page, id, ratio));
    await expect.soft(page).toHaveScreenshot(`main-${id}-${ratio}.png`);
  }
  await scrollTo(page, 1e6);
  await expect.soft(page).toHaveScreenshot('main-closing.png');
  await page.getByRole('link', { name: '인트로 다시 보기' }).focus();
  await expect.soft(page).toHaveScreenshot('main-closing-focus.png');
});

test('메인 동작 줄이기 전체', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/main');
  await settle(page);
  await expect.soft(page).toHaveScreenshot('main-reduced-full.png', { fullPage: true });
});

test('메인 바로가기·메뉴', async ({ page }) => {
  await page.goto('/main');
  await settle(page);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  await expect.soft(page).toHaveScreenshot('main-skip-focus.png');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  await expect.soft(page).toHaveScreenshot('main-menu-trigger-focus.png');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  await expect.soft(page).toHaveScreenshot('main-menu-open.png');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  await expect.soft(page).toHaveScreenshot('main-menu-link-focus.png');
  await page.getByRole('link', { name: /구조/ }).hover();
  await page.waitForTimeout(300);
  await expect.soft(page).toHaveScreenshot('main-menu-link-hover.png');
});

test('404', async ({ page }) => {
  await page.goto('/no-such-page');
  await settle(page);
  await expect.soft(page).toHaveScreenshot('not-found.png', { fullPage: true });
  await page.keyboard.press('Tab');
  await expect.soft(page).toHaveScreenshot('not-found-focus.png', { fullPage: true });
});

for (const id of [
  'app-errorpage--default',
  'shared-noticescreen--with-button',
  'shared-noticescreen--with-mark',
  'pages-main-sitemenu--default',
]) {
  test(`Storybook ${id}`, async ({ page }) => {
    await page.goto(`/storybook/iframe.html?id=${id}&viewMode=story`);
    await page.locator('#storybook-root > *').first().waitFor();
    await settle(page);
    await expect.soft(page).toHaveScreenshot(`sb-${id}.png`, { fullPage: true });
  });
}

test('메인 스크롤 연출(애니메이션 그대로)', async ({ page }) => {
  await page.goto('/main');
  await settle(page);
  const options = { animations: 'allow' } as const;
  await scrollTo(page, Math.round(await page.evaluate(() => window.innerHeight * 0.3)));
  await expect.soft(page).toHaveScreenshot('anim-hero-exit.png', options);
  for (const [id, ratio] of [
    ['prologue', 0.2],
    ['prologue', 0.45],
    ['structure', 0.1],
    ['structure', 0.4],
    ['archive', 0],
  ] as const) {
    await scrollTo(page, await sectionAt(page, id, ratio));
    await expect.soft(page).toHaveScreenshot(`anim-${id}-${ratio}.png`, options);
  }
});

// WebGL 장면을 띄우는 검사는 맨 끝에 둡니다. 소프트웨어 GL로 장면을 그린 뒤 같은 브라우저에서 다음 화면을 찍으면
// 가끔 화면을 찍지 못해(Page.captureScreenshot 오류) 다시 돌려야 했습니다.
test.describe('인트로 장면 준비 뒤(데스크톱)', () => {
  test.skip(({ isMobile }) => isMobile, '데스크톱에서만 봅니다');

  test('장면 준비 뒤 정지 버튼(캔버스 숨김)', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('/');
    await page.locator('[data-scene="ready"]').waitFor({ timeout: 200_000 });
    await page.addStyleTag({ content: 'canvas{visibility:hidden!important}' });
    await page.waitForFunction(() => document.fonts.status === 'loaded');
    await page.waitForTimeout(800);
    const pause = page.getByRole('button', { name: '배경 애니메이션 정지' });
    await pause.focus();
    await expect.soft(page).toHaveScreenshot('intro-pause-focus.png');
    await pause.click();
    await page.mouse.move(5, 5);
    await page.getByRole('button', { name: '배경 애니메이션 재생' }).focus();
    await page.waitForTimeout(500);
    await expect.soft(page).toHaveScreenshot('intro-paused.png');
  });
});
