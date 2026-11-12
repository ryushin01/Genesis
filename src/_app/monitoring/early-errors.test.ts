import { afterEach, expect, it, vi } from 'vitest';

type SentryEvent = { exception?: { values?: { mechanism?: unknown }[] } };
type EventProcessor = (event: SentryEvent) => SentryEvent;

const sentry = vi.hoisted(() => {
  
  const processors: (EventProcessor)[] = [];
  return {
    processors,
    init: vi.fn(),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    withScope: vi.fn((callback: (scope: unknown) => void) =>
      callback({ addEventProcessor: (processor: EventProcessor) => processors.push(processor) }),
    ),
  };
});
vi.mock('./sentry', () => sentry);
vi.mock('web-vitals', () => ({ onCLS() {}, onINP() {}, onLCP() {}, onFCP() {}, onTTFB() {} }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it('Sentry를 받기 전에 난 오류도 준비되면 처리되지 않은 오류로 보낸다', async () => {
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@o1.ingest.sentry.io/1');
  const { initMonitoring } = await import('./index');

  initMonitoring();
  const error = new Error('첫 화면 오류');
  window.dispatchEvent(new ErrorEvent('error', { error }));

  await vi.waitFor(() => expect(sentry.captureException).toHaveBeenCalledWith(error));
  const event = { exception: { values: [{ mechanism: { type: 'generic', handled: true } }] } };
  for (const process of sentry.processors) process(event);
  expect(event.exception.values[0]?.mechanism).toEqual({ type: 'onerror', handled: false });
});

it('콘솔·세션·브레드크럼 연동은 끈다', async () => {
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@o1.ingest.sentry.io/1');
  const { initMonitoring } = await import('./index');

  initMonitoring();
  await vi.waitFor(() => expect(sentry.init).toHaveBeenCalled());
  const { integrations } = sentry.init.mock.calls.at(-1)![0];
  const kept = integrations(['Console', 'BrowserSession', 'Breadcrumbs', 'GlobalHandlers'].map((name) => ({ name })));
  expect(kept.map(({ name }: { name: string }) => name)).toEqual(['GlobalHandlers']);
});
