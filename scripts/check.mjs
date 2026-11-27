// CI와 같은 검사를 같은 순서로 돌립니다(`pnpm check`). CI(.github/workflows/ci.yml)도 이 스크립트 하나를 부릅니다.
// 한 번 만든 프로덕션 빌드(Storybook 포함)를 E2E·크기·Lighthouse가 다시 씁니다. 하나라도 실패하면 거기서 멈춥니다.
// 로컬에서는 Lighthouse 결과를 바깥(임시 공개 저장소)에 올리지 않고 .lighthouseci에 저장합니다.
import { spawnSync } from 'node:child_process';

const ci = Boolean(process.env.CI);
const steps = [
  ['ESLint', ['lint']],
  ['FSD(Steiger)', ['lint:fsd']],
  ['타입 검사', ['typecheck']],
  ['단위 테스트·커버리지', ['test:coverage']],
  ['커버리지 요약', ['exec', 'node', 'scripts/coverage-summary.mjs']],
  ['빌드(Storybook + Next)', ['build']],
  ['E2E(기능·오프라인·접근성·시각·성능)', ['e2e'], { E2E_PREBUILT: '1' }],
  ['번들 크기', ['size']],
  ['Lighthouse', ['lhci', ...(ci ? [] : ['--upload.target=filesystem', '--upload.outputDir=.lighthouseci'])]],
];

const timings = [];
for (const [name, args, env] of steps) {
  console.log(`\n▶ ${name}: pnpm ${args.join(' ')}`);
  const start = Date.now();
  const result = spawnSync('pnpm', args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
    // Windows에서는 pnpm이 .cmd라 셸로 부릅니다.
    shell: process.platform === 'win32',
  });
  const seconds = (Date.now() - start) / 1000;
  timings.push([name, seconds, result.status === 0]);
  if (result.status !== 0) {
    console.error(`\n✖ ${name} 실패(${seconds.toFixed(1)}초)`);
    report();
    process.exit(result.status ?? 1);
  }
}
report();

function report() {
  console.log('\n단계별 시간');
  for (const [name, seconds, ok] of timings) console.log(`${ok ? '✓' : '✖'} ${name}: ${seconds.toFixed(1)}초`);
}
