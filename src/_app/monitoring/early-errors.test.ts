import { afterEach, expect, it, vi } from 'vitest';

const sentry = vi.hoisted(() => ({ init: vi.fn(), captureException: vi.fn(), captureMessage: vi.fn() }));
vi.mock('./sentry', () => sentry);
vi.mock('web-vitals', () => ({ onCLS() {}, onINP() {}, onLCP() {}, onFCP() {}, onTTFB() {} }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it('Sentry를 받기 전에 난 오류도 준비되면 보낸다', async () => {
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@o1.ingest.sentry.io/1');
  const { initMonitoring } = await import('./index');

  initMonitoring();
  const error = new Error('첫 화면 오류');
  window.dispatchEvent(new ErrorEvent('error', { error }));

  await vi.waitFor(() => expect(sentry.captureException).toHaveBeenCalledWith(error));
  expect(sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: 'https://key@o1.ingest.sentry.io/1' }));
});
