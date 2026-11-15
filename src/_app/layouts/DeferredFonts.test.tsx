import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeferredFonts } from "./DeferredFonts";

const fontLink = () => document.head.querySelector<HTMLLinkElement>('link[href="/fonts/test.css"]');

describe("DeferredFonts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("페이지를 다 받고 1초 뒤에 글꼴 CSS를 낮은 우선순위로 붙이고, 받으면 적용한다", () => {
    const { unmount } = render(<DeferredFonts href="/fonts/test.css" />);
    expect(fontLink()).toBeNull();

    vi.advanceTimersByTime(1000);
    const link = fontLink();
    expect(link?.rel).toBe("stylesheet");
    expect(link?.media).toBe("print");

    link?.dispatchEvent(new Event("load"));
    expect(link?.media).toBe("all");

    unmount();
    expect(fontLink()).toBeNull();
  });
});
