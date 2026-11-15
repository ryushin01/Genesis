"use client";

import { useEffect } from "react";

/** 페이지를 다 받은 뒤 기다리는 시간. 첫 화면 그리기와 겹치지 않게 함 */
const DELAY_MS = 1000;
const IDLE_TIMEOUT_MS = 2000;

/**
 * 큰 글꼴 CSS를 페이지를 다 받고 한가할 때 붙입니다.
 * KBIZ한마음명조는 변형할 수 없어 원본 파일(3.6MB)을 그대로 쓰므로, 첫 화면은 운영체제 글꼴로 그린 뒤 바꿉니다.
 */
export function DeferredFonts({ href }: { href: string }) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let idle: number | undefined;
    let link: HTMLLinkElement | undefined;
    const attach = () => {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      // print로 걸어 가장 낮은 우선순위로 받고, 다 받은 뒤 화면에 적용
      link.media = "print";
      link.onload = () => {
        if (link) link.media = "all";
      };
      document.head.append(link);
    };
    const schedule = () => {
      timer = setTimeout(() => {
        if (typeof window.requestIdleCallback === "function")
          idle = window.requestIdleCallback(attach, { timeout: IDLE_TIMEOUT_MS });
        else attach();
      }, DELAY_MS);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("load", schedule);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      link?.remove();
    };
  }, [href]);
  return null;
}
