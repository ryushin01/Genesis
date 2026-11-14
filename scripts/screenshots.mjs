// README의 인트로 화면 캡처(docs/images/intro-*.jpg)를 다시 만든다.
// 프로덕션 서버를 띄운 뒤 실행한다: pnpm build && pnpm start -p 3210 & pnpm screenshots [주소]
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3210";
const out = "docs/images";
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.jpg`, type: "jpeg", quality: 82 });

// WebGL 장면이 그려지도록 소프트웨어 렌더러를 켠다.
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(base);
// 불사조 모델을 다 받을 때까지 기다린다(로딩 표시가 사라짐).
await page.getByText("불사조를 깨우는 중").waitFor({ state: "detached", timeout: 120_000 }).catch(() => {});
await page.waitForTimeout(4000);
await shot(page, "intro-hero");

// 장의 가운데쯤으로 옮긴 뒤 장면이 스크롤을 따라올 때까지 기다린다.
async function chapter(name, at, file) {
  await page.evaluate(
    ([n, ratio]) => {
      const el = document.querySelector(`[data-chapter][data-name="${n}"]`);
      window.scrollTo(0, el.offsetTop + el.offsetHeight * ratio);
    },
    [name, at],
  );
  await page.waitForTimeout(5000);
  await shot(page, file);
}

await chapter("myths", 0.45, "intro-myth");
await chapter("war", 0.55, "intro-war");
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(6000);
await shot(page, "intro-zero");

await browser.close();
