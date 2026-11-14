// README의 인트로 화면 캡처(docs/images/intro-*.jpg)를 다시 만든다.
// 프로덕션 서버를 먼저 띄운다: pnpm build 뒤 다른 터미널에서 pnpm start -p 3210을 실행하고,
// 서버가 응답하면 pnpm screenshots [주소]를 실행한다.
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3210";
const out = "docs/images";
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.jpg`, type: "jpeg", quality: 82 });

// WebGL 장면이 그려지도록 소프트웨어 렌더러를 켠다.
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(base);
// 불사조 장면이 준비될 때까지 기다린다. 불러오지 못했으면 기존 캡처를 덮어쓰지 않고 멈춘다.
await page.locator('[data-scene="ready"], [data-scene="failed"]').first().waitFor({ timeout: 120_000 });
if ((await page.locator("[data-scene]").getAttribute("data-scene")) !== "ready") {
  await browser.close();
  throw new Error("불사조 장면을 불러오지 못해 스크린샷을 바꾸지 않았습니다.");
}
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
