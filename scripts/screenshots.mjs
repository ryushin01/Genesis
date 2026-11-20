// README 화면 캡처(docs/images의 인트로 intro-*, 메인 main-*, 모바일 mobile-*)를 다시 만든다.
// 프로덕션 서버를 먼저 띄운다: pnpm build 뒤 다른 터미널에서 pnpm start -p 3210을 실행하고,
// 서버가 응답하면 pnpm screenshots [주소]를 실행한다.
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3210";
const out = "docs/images";
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.jpg`, type: "jpeg", quality: 82 });

// WebGL 장면이 그려지도록 소프트웨어 렌더러를 켠다.
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 한글 글꼴(우아한 세리프, 줄인 파일 이름 GenesisSerif)을 받아 그린 뒤에 찍는다.
// 화면에 쓰인 글꼴 면이 하나도 받아지지 않았으면 기존 캡처를 덮어쓰지 않고 멈춘다.
async function fontsReady(p) {
  await p.evaluate(() => document.fonts.ready);
  const loaded = await p.evaluate(() =>
    [...document.fonts].some((face) => face.family.includes("GenesisSerif") && face.status === "loaded"),
  );
  if (!loaded) {
    await browser.close();
    throw new Error("우아한 세리프(GenesisSerif)를 받지 못해 스크린샷을 바꾸지 않았습니다.");
  }
}

await page.goto(base);
await fontsReady(page);
// 불사조 장면이 준비될 때까지 기다린다. 불러오지 못했으면 기존 캡처를 덮어쓰지 않고 멈춘다.
await page.locator('[data-scene="ready"], [data-scene="failed"]').first().waitFor({ timeout: 120_000 });
if ((await page.locator("[data-scene]").getAttribute("data-scene")) !== "ready") {
  await browser.close();
  throw new Error("불사조 장면을 불러오지 못해 스크린샷을 바꾸지 않았습니다.");
}
await page.waitForTimeout(4000);
await shot(page, "intro-hero");

// 장의 가운데쯤으로 옮긴 뒤 장면이 스크롤을 따라올 때까지 기다린다.
// 소프트웨어 렌더러는 초당 몇 프레임뿐이고 장면은 한 프레임에 최대 0.05초만큼만 따라오므로, 장을 건너뛰면 여유 있게 기다린다.
// 컴퓨터가 바빠 장면이 덜 따라온 채 찍히면 SCREENSHOT_WAIT_MS로 늘린다(예: SCREENSHOT_WAIT_MS=20000 pnpm screenshots).
const CATCH_UP = Number(process.env.SCREENSHOT_WAIT_MS) || 9000;
async function chapter(name, at, file) {
  await page.evaluate(
    ([n, ratio]) => {
      const el = document.querySelector(`[data-chapter][data-name="${n}"]`);
      window.scrollTo(0, el.offsetTop + el.offsetHeight * ratio);
    },
    [name, at],
  );
  await page.waitForTimeout(CATCH_UP);
  await shot(page, file);
}

await chapter("myths", 0.45, "intro-myth");
await chapter("war", 0.55, "intro-war");
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
// 끝 장면은 깃털을 많이 그려 더 느리므로, 로고가 다 나타날 때까지 두 배로 기다린다.
await page.waitForTimeout(CATCH_UP * 2);
await shot(page, "intro-zero");

// 메인 화면: 첫 화면, 서사(흐릿한 글이 차례로 또렷해지는 중간), 구조(우주 카드가 가운데 온 때)
async function section(p, id, ratio, file) {
  await p.evaluate(
    ([i, r]) => {
      const el = document.getElementById(i);
      window.scrollTo(0, el.offsetTop + (el.offsetHeight - window.innerHeight) * r);
    },
    [id, ratio],
  );
  await p.waitForTimeout(2000);
  await shot(p, file);
}

await page.goto(`${base}/main`);
await fontsReady(page);
await page.waitForTimeout(2500);
await shot(page, "main-hero");
await section(page, "prologue", 0.4, "main-prologue");
await section(page, "structure", 0.7, "main-structure");

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await mobile.goto(`${base}/main`);
await fontsReady(mobile);
await mobile.waitForTimeout(1500);
await section(mobile, "prologue", 0.3, "mobile-prologue");

await browser.close();
