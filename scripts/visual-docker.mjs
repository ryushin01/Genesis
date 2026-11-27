// 시각 회귀 검사를 Linux 브라우저로 돌립니다(`pnpm visual:docker`, 뒤에 `--update-snapshots` 등을 붙일 수 있음).
// 기준 이미지는 Linux(CI)에서 만든 것이라 macOS 브라우저로 찍으면 글자 렌더링이 달라집니다. 그래서 Playwright 공식 Docker 이미지에서
// 브라우저 서버(run-server)만 띄우고, 테스트와 E2E 서버는 이 기기에서 돌려 그 브라우저에 붙습니다(루프백은 exposeNetwork로 넘김).
// Docker(또는 colima)가 켜져 있어야 합니다. 끝나면 컨테이너를 지웁니다.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('node_modules/@playwright/test/package.json', 'utf8'));
const image = `mcr.microsoft.com/playwright:v${version}-noble`;
const port = Number(process.env.VISUAL_DOCKER_PORT ?? 3399);
const name = `genesis-visual-${process.pid}`;

const docker = (...args) => spawnSync('docker', args, { stdio: 'inherit' });

const started = docker(
  'run', '--rm', '-d', '--name', name, '--init', '--ipc=host', '-p', `${port}:${port}`,
  // 브라우저 임시 파일·npx 캐시는 메모리(tmpfs)에 둡니다. Docker 디스크가 가득 차도 찍을 수 있고, 끝나면 남지 않습니다.
  // 기준 이미지는 CI(x86_64)에서 찍은 것입니다. 그러데이션은 CPU 종류(ARM·x86)마다 래스터 결과가 달라, Apple Silicon에서도
  // amd64 이미지를 씁니다(colima는 `colima start --arch x86_64` 또는 `--vz-rosetta`로 에뮬레이션을 켬).
  '--platform', 'linux/amd64',
  '--tmpfs', '/tmp:rw,exec,size=2g', '-e', 'npm_config_cache=/tmp/.npm', '-e', 'HOME=/tmp',
  image,
  '/bin/sh', '-c', `cd /tmp && npx -y playwright@${version} run-server --port ${port} --host 0.0.0.0`,
);
if (started.status !== 0) {
  console.error('Docker 컨테이너를 띄우지 못했습니다. Docker(colima start)가 켜져 있는지 확인하세요.');
  process.exit(1);
}

/**
 * 브라우저 서버가 받을 준비가 될 때까지 기다립니다(처음에는 이미지를 받느라 오래 걸림).
 * Docker의 포트 전달은 컨테이너 안 서버가 뜨기 전에도 연결을 받으므로, HTTP 응답이 올 때까지 봅니다.
 */
async function waitForServer(deadline) {
  while (Date.now() < deadline) {
    try {
      await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(2000) });
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return false;
}

let status = 1;
try {
  if (!(await waitForServer(Date.now() + 300_000))) throw new Error('브라우저 서버가 5분 안에 뜨지 않았습니다.');
  const result = spawnSync(
    'pnpm',
    ['exec', 'playwright', 'test', '--project=visual-desktop', '--project=visual-mobile', ...process.argv.slice(2)],
    {
      stdio: 'inherit',
      env: { ...process.env, VISUAL_WS_ENDPOINT: `ws://127.0.0.1:${port}/` },
      shell: process.platform === 'win32',
    },
  );
  status = result.status ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore' });
}
process.exit(status);
