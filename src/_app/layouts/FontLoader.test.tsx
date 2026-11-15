import { afterEach, describe, expect, it, vi } from 'vitest';

import { FONT_LOADER_SCRIPT, FONT_LOADER_TIMEOUT_MS } from './FontLoader';

const run = () => new Function(FONT_LOADER_SCRIPT)();
const state = () => document.documentElement.dataset.fonts;
const stubFonts = (load: unknown) =>
  Object.defineProperty(document, 'fonts', { value: { load }, configurable: true });

describe('FontLoader', () => {
  afterEach(() => {
    delete document.documentElement.dataset.fonts;
    vi.useRealTimers();
  });

  it('KBIZ한마음명조를 다 받으면 화면을 연다', async () => {
    const load = vi.fn().mockResolvedValue([]);
    stubFonts(load);
    run();
    expect(state()).toBe('loading');
    await vi.waitFor(() => expect(state()).toBe('ready'));
    expect(load).toHaveBeenCalledWith('400 1em "KBIZ Hanmaum Myungjo"', '가');
  });

  it('글꼴이 늦으면 제한 시간 뒤에 연다', () => {
    vi.useFakeTimers();
    stubFonts(() => new Promise(() => {}));
    run();
    vi.advanceTimersByTime(FONT_LOADER_TIMEOUT_MS - 1);
    expect(state()).toBe('loading');
    vi.advanceTimersByTime(1);
    expect(state()).toBe('ready');
  });
});
