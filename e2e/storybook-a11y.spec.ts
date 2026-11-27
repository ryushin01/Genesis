import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * 함께 배포한 Storybook의 모든 스토리를 axe로 검사합니다. 위반이 하나라도 있으면 실패합니다
 * (`.storybook/preview.ts`의 `a11y: { test: 'error' }`와 같은 기준). 스토리 목록은 빌드한 index.json에서 읽습니다.
 */
interface StoryIndex {
  entries: Record<string, { id: string; type: string }>;
}

function isStoryIndex(value: unknown): value is StoryIndex {
  return typeof value === 'object' && value !== null && 'entries' in value && typeof value.entries === 'object';
}

test('Storybook의 모든 스토리에 접근성 위반이 없다', async ({ page, request, isMobile }) => {
  test.skip(isMobile, '스토리는 데스크톱에서 한 번만 봅니다');
  const response = await request.get('/storybook/index.json');
  expect(response.status()).toBe(200);
  const index: unknown = await response.json();
  if (!isStoryIndex(index)) throw new Error('Storybook index.json 모양이 다릅니다.');
  const stories = Object.values(index.entries).filter((entry) => entry.type === 'story');
  expect(stories.length).toBeGreaterThan(0);

  for (const { id } of stories) {
    await test.step(id, async () => {
      await page.goto(`/storybook/iframe.html?id=${id}&viewMode=story`);
      await page.locator('#storybook-root > *').first().waitFor();
      const { violations } = await new AxeBuilder({ page }).include('#storybook-root').analyze();
      expect(violations.map((violation) => `${violation.id}: ${violation.help}`), id).toEqual([]);
    });
  }
});
