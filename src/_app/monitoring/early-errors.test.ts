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
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
});

it('load가 10초 안에 오지 않으면 한가할 때를 기다리지 않고 10초에 Sentry를 받는다', async () => {
  vi.useFakeTimers();
  vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
  // 한가한 때가 오지 않는 브라우저: 기한에 다시 requestIdleCallback을 기다리면 받지 못합니다.
  const idleWindow = window as unknown as { requestIdleCallback?: () => number };
  const original = idleWindow.requestIdleCallback;
  idleWindow.requestIdleCallback = vi.fn(() => 0);
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@o1.ingest.sentry.io/1');
  const { initMonitoring } = await import('./index');
  sentry.init.mockClear();

  try {
    initMonitoring();
    await vi.advanceTimersByTimeAsync(9_000);
    expect(sentry.init).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.waitFor(() => expect(sentry.init).toHaveBeenCalledTimes(1));
  } finally {
    if (original) idleWindow.requestIdleCallback = original;
    else delete idleWindow.requestIdleCallback;
  }
});

it('load가 10초 안에 오면 기한을 거두고 한가할 때를 기다린다', async () => {
  vi.useFakeTimers();
  vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
  // 한가할 때 부를 함수를 모아 두었다가 직접 부릅니다.
  const idleCallbacks: Array<() => void> = [];
  const idleWindow = window as unknown as { requestIdleCallback?: (callback: () => void) => number };
  const original = idleWindow.requestIdleCallback;
  idleWindow.requestIdleCallback = vi.fn((callback: () => void) => idleCallbacks.push(callback));
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@o1.ingest.sentry.io/1');
  const { initMonitoring } = await import('./index');
  sentry.init.mockClear();

  try {
    initMonitoring();
    await vi.advanceTimersByTimeAsync(9_000);
    window.dispatchEvent(new Event('load'));
    // 10초가 지나도 한가할 때가 오기 전에는 받지 않습니다.
    await vi.advanceTimersByTimeAsync(2_000);
    expect(sentry.init).not.toHaveBeenCalled();
    for (const callback of idleCallbacks) callback();
    await vi.waitFor(() => expect(sentry.init).toHaveBeenCalledTimes(1));
  } finally {
    if (original) idleWindow.requestIdleCallback = original;
    else delete idleWindow.requestIdleCallback;
  }
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

  // 감싼 콜백의 인수는 보내지 않습니다.
  const { beforeSend } = sentry.init.mock.calls.at(-1)![0];
  expect(beforeSend({ extra: { arguments: ['secret'], __serialized__: { email: 'a@b.c' }, other: 1 } })).toEqual({ extra: { other: 1 } });
  expect(beforeSend({ request: { url: 'https://example.com/login#access_token=secret' } })).toEqual({
    request: { url: 'https://example.com/login' },
  });
});
