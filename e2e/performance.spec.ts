import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

/**
 * 3D 인트로의 성능: Lighthouse는 장면이 뜨기 전에 재므로, 장면을 띄운 뒤의 Web Vitals와 프레임을 여기서 봅니다.
 * web-vitals(앱과 같은 라이브러리)의 IIFE 판을 페이지보다 먼저 넣어 LCP·CLS·INP를 받고, 스크롤하는 동안의 프레임 간격을 잽니다.
 * CI에는 GPU가 없어 장면을 소프트웨어로 그리므로, 프레임 기준은 실제 기기가 아니라 "그 환경에서도 멈추지 않는다"는 하한입니다.
 */
const WEB_VITALS = path.join(process.cwd(), 'node_modules/web-vitals/dist/web-vitals.iife.js');

interface Measured {
  vitals: Record<string, number>;
  frames: number[];
}

function isMeasured(value: unknown): value is Measured {
  return typeof value === 'object' && value !== null && 'vitals' in value && 'frames' in value && Array.isArray(value.frames);
}

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] ?? 0;
};

test('3D 인트로: Web Vitals가 좋음 기준 안이고, 스크롤하는 동안 그리기가 멈추지 않는다', async ({ page, isMobile }) => {
  test.skip(isMobile, '장면을 띄우는 검사는 데스크톱에서만 합니다');
  test.setTimeout(180_000);
  // Playwright는 넣는 스크립트를 함수로 감싸므로, IIFE가 만든 webVitals를 전역에 직접 둡니다.
  await page.addInitScript({ content: `${readFileSync(WEB_VITALS, 'utf8')}\nwindow.webVitals = webVitals;` });
  await page.addInitScript(() => {
    const vitals: Record<string, number> = {};
    const frames: number[] = [];
    const measured = { vitals, frames };
    Object.assign(window, { __measured: measured });
    const save = (metric: { name: string; value: number }) => {
      vitals[metric.name] = metric.value;
    };
    const library = Reflect.get(window, 'webVitals');
    for (const name of ['onLCP', 'onCLS', 'onINP', 'onFCP']) Reflect.get(library, name)(save, { reportAllChanges: true });
  });
  const read = async () => {
    const value: unknown = await page.evaluate(() => Reflect.get(window, '__measured'));
    if (!isMeasured(value)) throw new Error('측정값을 읽지 못했습니다.');
    return value;
  };

  await page.goto('/');
  const pause = page.getByRole('button', { name: '배경 애니메이션 정지' });
  // CI에는 GPU가 없어 장면이 느리게 뜹니다.
  await expect(pause).toBeVisible({ timeout: 60_000 });

  // 인트로 끝까지 4초 동안 고르게 스크롤하며 프레임 간격을 모읍니다.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const measured = Reflect.get(window, '__measured');
        const frames: number[] = Reflect.get(measured, 'frames');
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const duration = 4_000;
        const start = performance.now();
        let previous = start;
        const step = (now: number) => {
          frames.push(now - previous);
          previous = now;
          const t = Math.min(1, (now - start) / duration);
          window.scrollTo(0, max * t);
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      }),
  );

  // 정지 버튼을 눌러 INP(입력 반응)를 만들고, 페이지를 숨겨 지표를 마감합니다.
  await page.evaluate(() => window.scrollTo(0, 0));
  await pause.click();
  await expect(page.getByRole('button', { name: '배경 애니메이션 재생' })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  const { vitals, frames } = await read();
  const median = percentile(frames, 0.5);
  const p95 = percentile(frames, 0.95);
  const summary = {
    LCP: Math.round(vitals.LCP ?? -1),
    FCP: Math.round(vitals.FCP ?? -1),
    CLS: Number((vitals.CLS ?? 0).toFixed(4)),
    INP: Math.round(vitals.INP ?? -1),
    frames: frames.length,
    medianFrameMs: Math.round(median),
    p95FrameMs: Math.round(p95),
    longestFrameMs: Math.round(Math.max(...frames)),
  };
  test.info().annotations.push({ type: '측정', description: JSON.stringify(summary) });
  console.log('3D 인트로 측정', summary);

  // Web Vitals '좋음' 기준(web.dev): LCP 2.5초, CLS 0.1, INP 200ms 이하.
  expect(vitals.LCP, 'LCP').toBeLessThanOrEqual(2_500);
  expect(vitals.CLS ?? 0, 'CLS').toBeLessThanOrEqual(0.1);
  if (vitals.INP !== undefined) expect(vitals.INP, 'INP').toBeLessThanOrEqual(200);
  // 프레임: 해상도 자동 조절이 있으므로 GPU 없는 CI에서도 대부분의 프레임은 10fps(100ms) 안에 그려야 하고,
  // 1초 넘게 멈춘 프레임이 없어야 합니다.
  expect(frames.length, '프레임 수').toBeGreaterThan(20);
  expect(median, '프레임 간격 중앙값(ms)').toBeLessThanOrEqual(100);
  expect(Math.max(...frames), '가장 긴 프레임(ms)').toBeLessThanOrEqual(1_000);
});
