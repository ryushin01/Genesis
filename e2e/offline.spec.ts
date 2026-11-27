import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/_pages/intro/model/chapters';

/**
 * 오프라인 검사: 사이트 밖으로 나가는 요청을 모두 끊은 상태에서도 모든 화면·주요 상태가 내용과 함께 뜨는지 봅니다.
 * 글꼴·3D 모델·Storybook은 저장소에 들어 있고, Sentry는 DSN이 없으면 번들에 넣지 않으므로 바깥 요청이 없어야 합니다.
 * - 로컬: `.env` 없이 만든 프로덕션 빌드(playwright.config.ts의 webServer)로 돌립니다(`pnpm e2e`).
 * - 배포본: `pnpm e2e:deployed`(기본 운영 주소, `E2E_BASE_URL`로 바꿈)는 같은 검사를 배포한 사이트에 돌립니다.
 *   이때는 그 사이트의 출처만 열고 나머지 바깥 요청을 모두 끊습니다.
 * 화면에서 처리하지 못한 오류(pageerror)도 없어야 합니다.
 */
const test = base.extend<{ external: string[]; pageErrors: string[] }>({
  external: [
    async ({ context, baseURL }, use) => {
      const site = baseURL ? new URL(baseURL).host : '';
      const external: string[] = [];
      await context.route('**/*', (route) => {
        const { host, hostname, protocol } = new URL(route.request().url());
        if (
          protocol === 'data:' ||
          protocol === 'blob:' ||
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          host === site
        ) {
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
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await use(errors);
      expect(errors, '처리하지 못한 화면 오류').toEqual([]);
    },
    { auto: true },
  ],
});

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
}

/** 화면이 쓰는 글꼴을 모두 저장소에서 받았는지 봅니다. Storybook처럼 글꼴을 따로 받지 않는 화면은 받지 못한 글꼴만 봅니다. */
async function expectFontsLoaded(page: Page, { requireLoaded = true } = {}) {
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((font) => font.status === 'loaded').map((font) => font.family),
  );
  if (requireLoaded) expect(loaded.length, '받은 글꼴').toBeGreaterThan(0);
  // next/font가 만드는 `… Fallback` 항목은 시스템 글꼴(local('Arial') 등)을 가리켜 Linux CI에서는 없을 수 있으므로 뺍니다.
  const failed = await page.evaluate(() =>
    [...document.fonts]
      .filter((font) => font.status === 'error' && !/Fallback/.test(font.family))
      .map((font) => font.family),
  );
  expect(failed, '받지 못한 글꼴').toEqual([]);
}

/** 요소와 조상의 불투명도를 곱한, 실제로 보이는 정도(0~1). 인트로의 장은 스크롤에 따라 조상의 투명도로 나타납니다. */
function shownOpacity(locator: Locator) {
  return locator.evaluate((element) => {
    let opacity = 1;
    for (let node: Element | null = element; node; node = node.parentElement) {
      opacity *= Number(getComputedStyle(node).opacity);
    }
    return opacity;
  });
}

/**
 * 인트로의 장(section)을 차례로 화면 가운데에 두고, 장의 글이 다 나타나는지 봅니다. 끝 장면은 맨 아래에서 봅니다.
 * 3D 장면을 띄운 채로 보면 GPU 없는 기기에서는 장면을 그리느라 스크롤 처리(rAF)가 늦으므로 기다리는 시간을 늘립니다.
 */
async function expectEveryChapter(page: Page, { timeout = 5_000 } = {}) {
  const story = page.getByRole('main');
  const sections = story.locator('section');
  await expect(sections).toHaveCount(CHAPTERS.length + 2);
  const scrollToMiddle = (index: number) =>
    sections.nth(index).evaluate((section) => {
      const top = section.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + Math.max(0, section.getBoundingClientRect().height - window.innerHeight) / 2, behavior: 'instant' });
    });

  await scrollToMiddle(0);
  const title = story.getByRole('heading', { level: 1, name: 'project zero' });
  await expect(title).toBeInViewport({ timeout });
  await expect.poll(() => shownOpacity(title), { timeout }).toBeGreaterThan(0.95);
  await expect(story.getByText('신화에서 우주 전쟁까지, 프로젝트 제로')).toBeVisible();

  for (const [index, chapter] of CHAPTERS.entries()) {
    await scrollToMiddle(index + 1);
    for (const line of chapter.lines) {
      const text = story.getByText(line, { exact: true });
      await expect(text, `${chapter.id} 장`).toBeInViewport({ timeout });
      await expect
        .poll(() => shownOpacity(text), { message: `${chapter.id} 장: ${line}`, timeout })
        .toBeGreaterThan(0.95);
    }
  }

  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  const finale = story.getByRole('heading', { level: 2, name: /모든 것은\s*제로에서 시작된다/ });
  const enter = story.getByRole('link', { name: '메인으로 들어가기' });
  await expect(finale).toBeInViewport({ timeout });
  await expect(enter).toBeInViewport({ timeout });
  // CI에는 GPU가 없어 장면이 느리게 그려집니다.
  await expect.poll(() => shownOpacity(enter), { timeout: 30_000 }).toBeGreaterThan(0.95);
  await expect(enter).toHaveAttribute('href', '/main');
  await expect(story.getByRole('link', { name: '3D 모델·아이콘 출처 (README)' })).toBeVisible();
}

/**
 * 동작 줄이기에서 움직이는 장면 대신 보이는 정지 화면(비행 장면 배경과 결말의 로고 장면)이
 * 저장소의 이미지로 실제로 그려지는지 봅니다. 화면에 보이는 배경 이미지 주소를 읽어 그대로 풀어 봅니다.
 */
async function expectStills(page: Page) {
  for (const [name, file] of [
    ['flight', 'still-flight.webp'],
    ['finale', 'still-finale.webp'],
  ] as const) {
    const still = page.locator(`[data-still="${name}"]`);
    await expect(still).toHaveCount(1);
    await expect(still).toHaveAttribute('aria-hidden', 'true');
    const decoded = await still.evaluate(async (element) => {
      const match = /url\("?([^")]+)"?\)/.exec(getComputedStyle(element).backgroundImage);
      if (!match) return { url: '', width: 0 };
      const image = new Image();
      image.src = match[1];
      await image.decode();
      return { url: new URL(image.src).pathname, width: image.naturalWidth };
    });
    expect(decoded.url).toBe(`/intro/${file}`);
    expect(decoded.width).toBeGreaterThan(0);
  }
}

/** 장면이 없을 때 보이는 CSS 배경(적색 그러데이션)이 깔려 있는지 봅니다. */
async function expectCssBackdrop(page: Page) {
  const backdrop = await page
    .locator('[data-motion]')
    .evaluate((root) => getComputedStyle(root, '::before').backgroundImage);
  expect(backdrop).toContain('radial-gradient');
  expect(backdrop).toContain('linear-gradient');
}

test.describe('오프라인: 인트로', () => {
  test('3D 장면을 띄우고 모든 장과 끝 장면을 보여 주며, 정지 버튼으로 멈춘다', async ({ page, isMobile }) => {
    test.skip(isMobile, 'WebGL 장면은 데스크톱 한 번만 띄웁니다');
    test.setTimeout(180_000);
    // 장면을 그리는 동안 장을 하나씩 넘기므로, 소프트웨어로 그리는 CI에서도 프레임이 너무 느려지지 않게 화면을 줄입니다(site.spec.ts와 같음).
    await page.setViewportSize({ width: 800, height: 500 });
    await page.goto('/');
    // 3D 모델(public/models)을 받아 장면을 띄우면 정지 버튼이 나옵니다. CI에는 GPU가 없어 느립니다.
    const pause = page.getByRole('button', { name: '배경 애니메이션 정지' });
    await expect(pause).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('canvas')).toHaveCount(1);
    await expect(page.getByRole('status')).toHaveText('');
    await pause.click();
    await expect(page.getByRole('button', { name: '배경 애니메이션 재생' })).toBeVisible();
    await expectEveryChapter(page, { timeout: 30_000 });
    await expectFontsLoaded(page);
    await expectNoViolations(page);
  });

  test('깃털·로고 모델을 받지 못해도 장면과 끝 장면을 보여 준다', async ({ page, isMobile }) => {
    test.skip(isMobile, 'WebGL 장면은 데스크톱에서만 띄웁니다');
    test.setTimeout(180_000);
    await page.route(/\/models\/(feathers|phoenix-logo|phoenix-feather)\.glb$/, (route) => route.abort('internetdisconnected'));
    await page.goto('/');
    await expect(page.getByRole('button', { name: '배경 애니메이션 정지' })).toBeVisible({ timeout: 60_000 });
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    const enter = page.getByRole('link', { name: '메인으로 들어가기' });
    await expect(enter).toBeInViewport();
    await expect.poll(() => shownOpacity(enter), { timeout: 30_000 }).toBeGreaterThan(0.95);
  });

  test('3D 모델을 받는 동안 로딩을 알리고, 받지 못하면 CSS 배경과 모든 글을 보여 준다', async ({ page }) => {
    // 모델 요청을 붙잡아 두었다가 끊습니다(받는 중 → 실패).
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/models/**', async (route) => {
      await held;
      await route.abort('internetdisconnected');
    });
    await page.goto('/');
    await expect(page.getByRole('status')).toHaveText('불사조를 깨우는 중');
    await expect(page.getByText('0%')).toBeVisible();

    release();
    await expect(page.getByRole('status')).toHaveText('');
    await expect(page.getByText('불사조를 깨우는 중')).toBeHidden();
    // 장면이 없으므로 정지 버튼도 없습니다.
    await expect(page.getByRole('button', { name: /배경 애니메이션/ })).toHaveCount(0);
    await expectCssBackdrop(page);
    await expectEveryChapter(page);
    await expectFontsLoaded(page);
    await expectNoViolations(page);
  });

  test('동작 줄이기에서는 장면 없이 정지 장면·결말 이미지와 모든 글을 보여 준다', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('canvas')).toHaveCount(0);
    await expectCssBackdrop(page);
    await expectStills(page);
    await expectEveryChapter(page);
    await expectFontsLoaded(page);
    await expectNoViolations(page);
  });
});

test.describe('오프라인: 메인', () => {
  test('모든 구역이 내용과 저장소 글꼴로 뜨고 접근성 위반이 없다', async ({ page }) => {
    await page.goto('/main');
    await expect(page.getByRole('heading', { level: 1, name: /프로젝트 제로/ })).toBeVisible();
    // 스크롤 연출(animation-timeline)로 나타나는 글도 구역에 닿으면 다 보여야 합니다.
    const sections: [string, Locator][] = [
      ['서사', page.getByText('서사', { exact: true })],
      ['세 개의 흐름', page.getByRole('heading', { level: 3, name: '전쟁' })],
      ['기록 보관소', page.getByText('기록 준비 중').last()],
    ];
    for (const [name, content] of sections) {
      const heading = page.getByRole('heading', { level: 2, name });
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeVisible();
      await content.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy({ top: window.innerHeight / 2, behavior: 'instant' }));
      await expect.poll(() => shownOpacity(content), { message: name }).toBeGreaterThan(0.95);
    }
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await expect(page.getByText('모든 것은 제로에서 시작된다.')).toBeInViewport();
    await expect(page.getByRole('link', { name: '인트로 다시 보기' }).last()).toBeVisible();
    await expect(page.getByRole('contentinfo').getByRole('link', { name: '디자인 시스템(Storybook)' })).toBeVisible();
    await expectFontsLoaded(page);
    await expectNoViolations(page);
  });

  test('메뉴가 열리고 구역으로 이동하며 접근성 위반이 없다', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/main');
    await page.getByRole('button', { name: /menu/i }).click();
    const dialog = page.getByRole('dialog', { name: '사이트 메뉴' });
    await expect(dialog).toBeVisible();
    for (const name of [/서사/, /구조/, /기록/, /인트로/]) {
      await expect(dialog.getByRole('link', { name })).toBeVisible();
    }
    await expectNoViolations(page);
    await dialog.getByRole('link', { name: /구조/ }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/#structure$/);
    await expect(page.getByRole('heading', { level: 2, name: '세 개의 흐름' })).toBeInViewport();
  });

  test('메인에서 인트로로 돌아가도 화면이 뜬다', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/main');
    await page.getByRole('link', { name: '인트로 다시 보기' }).last().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'project zero' })).toBeVisible();
  });
});

test.describe('오프라인: 안내 화면', () => {
  test('없는 주소는 404와 한국어 안내 화면을 보여 준다', async ({ page }) => {
    const response = await page.goto('/no-such-page');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다' })).toBeVisible();
    await expect(page.getByRole('link', { name: '메인으로 가기' })).toBeVisible();
    await expect(page.getByRole('link', { name: '인트로 보기' })).toBeVisible();
    await expectFontsLoaded(page);
    await expectNoViolations(page);
  });

  test('오류 화면(Storybook의 ErrorPage)이 내용과 버튼을 보여 준다', async ({ page }) => {
    // 정적 사이트라 운영 화면에서 오류 경계를 일부러 일으킬 길이 없어, 같은 컴포넌트를 함께 배포한 Storybook으로 엽니다.
    const response = await page.goto('/storybook/iframe.html?id=app-errorpage--default&viewMode=story');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: '화면을 그리지 못했습니다' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
    await expect(page.getByRole('link', { name: '메인으로 가기' })).toBeVisible();
    await expectFontsLoaded(page, { requireLoaded: false });
    await expectNoViolations(page);
  });

  test('함께 배포한 Storybook이 열린다', async ({ page, isMobile }) => {
    test.skip(isMobile, '데스크톱에서 한 번만 봅니다');
    const response = await page.goto('/storybook/index.html');
    expect(response?.status()).toBe(200);
    const preview = page.frameLocator('#storybook-preview-iframe');
    await expect(preview.locator('#storybook-root')).not.toBeEmpty({ timeout: 30_000 });
  });
});
