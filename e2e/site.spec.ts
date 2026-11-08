import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function expectNoOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
}

test.describe('인트로', () => {
  test('맨 아래까지 내려가야 메인으로 가는 버튼이 보이고, 누르면 메인으로 간다', async ({ page }) => {
    await page.goto('/');
    const enter = page.getByRole('link', { name: '메인으로 들어가기' });
    await expect.poll(() => page.locator('[data-motion="on"]').count()).toBe(1);
    const distance = await enter.evaluate((el) => el.closest('section')!.getBoundingClientRect().top / window.innerHeight);
    expect(distance).toBeGreaterThan(5);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    // CI에는 GPU가 없어 장면이 느리게 그려집니다.
    await expect
      .poll(() => enter.evaluate((el) => getComputedStyle(el.parentElement!).opacity), { timeout: 30_000 })
      .toBe('1');
    await expect(enter).toBeInViewport();
    await enter.click();
    await expect(page).toHaveURL(/\/main$/);
    await expect(page.getByRole('heading', { level: 1, name: /프로젝트 제로/ })).toBeVisible();
  });

  test('키보드로 버튼에 가면 맨 아래 장면으로 이동한다', async ({ page, isMobile }) => {
    test.skip(isMobile, '키보드 검사는 데스크톱에서만 합니다');
    await page.goto('/');
    await expect.poll(() => page.locator('[data-motion="on"]').count()).toBe(1);
    await page.getByRole('link', { name: '메인으로 들어가기' }).focus();
    await expect.poll(() => page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2)).toBe(true);
  });

  test('동작 줄이기에서는 장면 없이 모든 글을 보여 주고 접근성 위반이 없다', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('[data-motion="off"]')).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.getByText('SF 전쟁으로 이어진다.')).toBeVisible();
    await expectNoOverflow(page);
    await expectNoViolations(page);
  });
});

test.describe('메인', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/main');
  });

  test('화면이 넘치지 않고 접근성 위반이 없다', async ({ page }) => {
    await expectNoOverflow(page);
    await expectNoViolations(page);
  });

  test('메뉴로 구역을 이동하고 Esc로 닫는다', async ({ page }) => {
    await page.getByRole('button', { name: /menu/i }).click();
    const dialog = page.getByRole('dialog', { name: '사이트 메뉴' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await page.getByRole('button', { name: /menu/i }).click();
    await dialog.getByRole('link', { name: /기록/ }).click();
    await expect(page).toHaveURL(/#archive$/);
    await expect(page.getByRole('heading', { name: '기록 보관소' })).toBeInViewport();
  });

  test('인트로로 돌아갈 수 있다', async ({ page }) => {
    await page.getByRole('link', { name: '인트로 다시 보기' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
