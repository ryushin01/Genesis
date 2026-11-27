// 커버리지 요약(coverage/coverage-summary.json)을 표로 만듭니다. CI에서는 $GITHUB_STEP_SUMMARY에 붙이고, 로컬에서는 화면에 찍습니다.
// 먼저 pnpm test:coverage로 만듭니다.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const FILE = 'coverage/coverage-summary.json';
const METRICS = ['statements', 'branches', 'functions', 'lines'];
/** vitest.config.ts의 로직 계층 기준(80%)과 같은 묶음. */
const GROUPS = [
  ['공용 로직 shared/lib', (file) => file.startsWith('src/shared/lib/')],
  ['모델 */model', (file) => /\/model\//.test(file)],
  ['API */api', (file) => /\/api\//.test(file)],
  ['장면 모델 받기·진행률', (file) => file === 'src/_pages/intro/lib/fetchModel.ts'],
];

if (!existsSync(FILE)) {
  console.error(`${FILE}이 없습니다. 먼저 pnpm test:coverage를 돌리세요.`);
  process.exit(1);
}
const summary = JSON.parse(readFileSync(FILE, 'utf8'));
const files = Object.entries(summary)
  .filter(([key]) => key !== 'total')
  .map(([key, value]) => [path.relative(process.cwd(), key).split(path.sep).join('/'), value]);

/** 여러 파일의 수를 더해 비율을 다시 구합니다. */
function sum(entries) {
  return Object.fromEntries(
    METRICS.map((metric) => {
      const covered = entries.reduce((total, [, value]) => total + value[metric].covered, 0);
      const all = entries.reduce((total, [, value]) => total + value[metric].total, 0);
      return [metric, { covered, total: all, pct: all === 0 ? 100 : (covered / all) * 100 }];
    }),
  );
}

const cell = ({ covered, total, pct }) => `${pct.toFixed(2)}% (${covered}/${total})`;
const rows = [
  ['**전체**', summary.total],
  ...GROUPS.map(([name, match]) => [name, files.filter(([file]) => match(file))])
    .filter(([, entries]) => entries.length > 0)
    .map(([name, entries]) => [name, sum(entries)]),
];
const table = [
  '## 단위 테스트 커버리지',
  '',
  '| 묶음 | 문장 | 분기 | 함수 | 줄 |',
  '|---|---|---|---|---|',
  ...rows.map(([name, value]) => `| ${name} | ${METRICS.map((metric) => cell(value[metric])).join(' | ')} |`),
  '',
  '기준: 로직 계층 80% 이상, 전체는 기준선(`vitest.config.ts`) 이상.',
  '',
].join('\n');

if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, table);
else console.log(table);
