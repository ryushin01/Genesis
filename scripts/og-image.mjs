// 공유 미리보기(Open Graph) 그림을 만든다: README의 인트로 첫 화면 캡처(docs/images/intro-hero.jpg)에서
// 아래쪽 조작 버튼(정지·장 이름)과 부제를 뺀 위쪽을 1200×630(1.91:1)으로 잘라 줄인다.
// 인트로 첫 화면 캡처를 다시 찍으면(pnpm screenshots) 함께 다시 만든다. 단독 실행: pnpm og-image
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const SOURCE = "docs/images/intro-hero.jpg";
const OUT = "src/app/opengraph-image.jpg";
const WIDTH = 1200;
const HEIGHT = 630;

const source = await readFile(SOURCE);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const dataUrl = await page.evaluate(
    async ({ src, width, height }) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      // 원본 너비를 그대로 두고, 그 너비의 1.91:1 높이만큼 위에서부터 자릅니다.
      const cropHeight = Math.round((image.naturalWidth * height) / width);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, image.naturalWidth, cropHeight, 0, 0, width, height);
      return canvas.toDataURL("image/jpeg", 0.86);
    },
    { src: `data:image/jpeg;base64,${source.toString("base64")}`, width: WIDTH, height: HEIGHT },
  );
  await writeFile(OUT, Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log(`${OUT} (${WIDTH}×${HEIGHT})`);
} finally {
  await browser.close();
}
