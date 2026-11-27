// 크기 예산(gzip): 방문자가 실제로 받는 파일만 페이지별로 잽니다. 먼저 빌드(pnpm build)해야 합니다.
// 모든 청크를 더하면 모던 브라우저가 받지 않는 noModule 폴리필과, DSN이 없을 때 받지 않는 Sentry 청크까지 들어가
// 실제 비용과 달라지므로 나눠서 잽니다.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const APP_DIR = '.next/server/app';
const CHUNK_DIR = '.next/static/chunks';

/** 빌드한 HTML이 처음에 받는 스크립트(noModule 폴리필 제외). */
function firstLoadScripts(page) {
  const file = path.join(APP_DIR, `${page}.html`);
  if (!existsSync(file)) throw new Error(`${file}이 없습니다. 먼저 pnpm build로 빌드하세요.`);
  const html = readFileSync(file, 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="\/_next\/static\/(?:immutable\/)?chunks\/([^"]+\.js)"[^>]*>/g)]
    .filter(([tag]) => !/\bnomodule\b/i.test(tag))
    .map(([, name]) => path.join(CHUNK_DIR, name));
  if (scripts.length === 0) throw new Error(`${file}에서 스크립트를 찾지 못했습니다.`);
  return [...new Set(scripts)];
}

/** 나중에 따로 받는 청크를 내용으로 찾습니다(파일 이름에는 해시만 있습니다). */
function chunksContaining(marker) {
  return readdirSync(CHUNK_DIR)
    .filter((name) => name.endsWith('.js'))
    .map((name) => path.join(CHUNK_DIR, name))
    .filter((file) => readFileSync(file, 'utf8').includes(marker));
}

const scene = chunksContaining('WebGLRenderer');
if (scene.length === 0) throw new Error('인트로 장면(three.js) 청크를 찾지 못했습니다.');
const sentry = chunksContaining('__SENTRY__');

const budgets = [
  { name: '첫 화면 JS: 인트로 /', path: firstLoadScripts('index'), gzip: true, limit: '155 kB' },
  { name: '첫 화면 JS: 메인 /main', path: firstLoadScripts('main'), gzip: true, limit: '150 kB' },
  // 1.4.0: 레퍼런스 비행 장면(타임라인·결정 재질·우주 배경)으로 바꾸며 실제 측정값(186.6 kB)에 맞춰 187 kB로 다시 둠(사용자 원칙: 새 장면 예산은 측정값).
  { name: '인트로 장면(three.js, 장면을 띄울 때 받음)', path: scene, gzip: true, limit: '187 kB' },
  // DSN이 없는 빌드에서는 청크가 없을 수도 있습니다.
  ...(sentry.length > 0 ? [{ name: 'Sentry(DSN이 있을 때만 받음)', path: sentry, gzip: true, limit: '32 kB' }] : []),
  { name: 'CSS', path: `${CHUNK_DIR}/**/*.css`, gzip: true, limit: '8 kB' },
];

export default budgets;
