# Genesis (project zero) — 에이전트 작업 안내

이 저장소에서 일하는 AI 에이전트(Codex, Claude Code 등)를 위한 안내입니다. 자세한 내용은 [개발 가이드](docs/development.md)에 있습니다. `next dev`가 넣던 영어 안내 블록은 `next.config.ts`의 `agentRules: false`로 꺼 두었으므로 이 파일은 손으로 관리합니다. 그 블록의 내용은 이렇습니다: 이 저장소의 Next.js 16은 학습 데이터와 API·규칙·파일 구조가 다를 수 있으니, 코드를 쓰기 전에 `node_modules/next/dist/docs/`에서 해당 안내를 읽고 지원 중단(deprecation) 안내를 따릅니다.

## 1. 프로젝트 개요

- 소설 **프로젝트 제로**의 홍보 사이트입니다. three.js WebGL 인트로(`/`)와 흑백 메인(`/main`)으로 되어 있습니다.
- 화면 축: 웹 사이트 하나(홍보 사이트).
- 운영: https://zero.ryushin0.co.kr/ · Storybook https://zero.ryushin0.co.kr/storybook/index.html
- 작품 내용은 지어내지 않습니다. 기록 보관소는 "기록 준비 중"이고 인트로 문구는 작품 요약에서 뽑은 초안입니다. 작가 자료가 오면 개발 가이드의 '작품 내용 바꾸기'에 적힌 파일만 바꿉니다.

## 2. 기술 스택과 구조

- Next.js 16(App Router, 정적 페이지), React 19, TypeScript 6(`typescript-eslint` 때문에 고정), three.js, StyleX, Sentry(`@sentry/browser`)·web-vitals, Storybook 10.
- 스타일은 StyleX(`stylex.create`·`stylex.props`)입니다. 토큰은 `@/shared/ui/tokens.stylex`에서 바로 가져오고(index로 다시 내보내지 않음), 테마는 `shared/ui`의 `createTheme`, 전역 CSS는 `@font-face`와 `@layer reset` 초기화만 둡니다. 빌드 설정은 `stylex.config.mjs`(자세한 것은 개발 가이드 '스타일').
- Feature-Sliced Design(Next `app/`과 겹치지 않게 층 이름을 바꿈): `src/_app` → `_pages` → `shared`. `src/app`의 라우트 파일은 다시 내보내기만 합니다. `pnpm lint:fsd`(Steiger)로 검사합니다.
- 인트로 장면: `src/_pages/intro`(`model/`: 문구·타임라인·추종기, `lib/`: 장면·셰이더, `lib/scene/`: 부품). 셰이더 설명은 GLSL 문자열 안이 아니라 상수의 JSDoc에 씁니다.
- 3D 모델은 `public/models/*.glb`와 라이선스 원문(`*-license.txt`)입니다.

## 3. 설치·개발 명령

- Node.js 24(CI 기준), pnpm 12(`packageManager`).

```bash
pnpm install
pnpm dev          # 개발 서버
pnpm storybook    # http://localhost:6006
```

- 환경 변수(`.env.example`): `NEXT_PUBLIC_SENTRY_DSN`(없으면 Sentry를 번들에 넣지 않음). E2E 포트는 `E2E_PORT`(기본 3210).
- 그 밖: `pnpm fonts`(화면 글자를 바꾼 뒤 한글 글꼴 다시 만들기, `pip install fonttools brotli`), `pnpm screenshots`·`pnpm og-image`(서버를 먼저 띄움).

## 4. 검사·테스트 명령

CI(`.github/workflows/ci.yml`)는 `pnpm check`(`scripts/check.mjs`)의 묶음(`--only static|e2e|visual|budget`)을 부르며, 한 번 빌드한 결과로 E2E·시각·크기·Lighthouse 작업을 나란히 돌리고 필수 검사는 `check` 작업입니다. PR 전에 로컬에서도 `pnpm check`를 돌립니다(장비가 바쁘면 `E2E_PORT`로 빈 포트).

```bash
pnpm check            # 아래를 이 순서로, 빌드는 한 번만(E2E·크기·Lighthouse가 다시 씀)
pnpm lint             # ESLint (jsx-a11y recommended 전체)
pnpm lint:fsd         # Steiger
pnpm typecheck
pnpm test:coverage    # Vitest + 커버리지(로직 계층 80%, 전체 기준선, vitest.config.ts)
pnpm build            # Storybook(public/storybook) + Next
pnpm e2e              # E2E, axe(모든 화면·Storybook 스토리), CSP, WebGL 정리, 오프라인, 3D 성능
pnpm visual:docker    # 시각 회귀(데스크톱 41·모바일 38장, Docker 브라우저)
pnpm size             # size-limit(.size-limit.mjs, 첫 화면 JS 155/150 kB 등)
pnpm lhci             # Lighthouse(lighthouserc.json, 메인 성능 90·접근성 100). 로컬은 --upload.target=filesystem
```

- 시각 회귀(`e2e/__screenshots__`)는 로컬·CI 모두 Playwright 공식 Docker 이미지의 브라우저로 찍습니다(`pnpm visual:docker`, Docker·colima 필요, `--update-snapshots`로 다시 만들기). `pnpm check`가 E2E 다음에 부릅니다. 번들 예산과 Lighthouse 기준 숫자는 사용자 결정 없이 바꾸지 않습니다.
- `pnpm build`는 Storybook을 먼저 `public/storybook`에 빌드한 뒤 `next build`를 합니다.
- E2E는 WebGL을 GPU 없이 그리므로 작업자 1개로 돌립니다.
- **오프라인:** 인터넷과 `.env` 없이도 설치 뒤 빌드·실행·주요 화면이 되어야 합니다. `e2e/offline.spec.ts`(`pnpm e2e`에 포함)가 localhost 밖 요청을 모두 막고 인트로 모든 장·끝 장면(3D 장면, 모델 받는 중, 모델 실패 시 CSS 배경, 동작 줄이기), 메인 모든 구역·메뉴, 404, 오류 화면(Storybook), Storybook을 axe와 함께 보고 바깥 요청 0개·화면 오류 0개를 확인합니다. 배포본은 `pnpm e2e:deployed`(`E2E_BASE_URL`)로 같은 검사를 합니다. 글꼴은 모두 저장소 파일(`next/font/local`, `src/_app/styles/fonts`)이고 `next/font/google`·외부 CDN은 쓰지 않으며, 바깥 자료를 새로 쓰면 저장소에 넣습니다.
- **Testing Library 원칙:** 구현 세부가 아니라 사용자가 보는 동작을 검사하고, 요소는 역할·이름(`getByRole`)으로 찾습니다. 단위·컴포넌트는 Vitest + Testing Library(`@testing-library/react`, `user-event`, `jest-dom`), 화면 흐름은 Playwright E2E, 접근성은 axe(`@axe-core/playwright`)로 검사합니다. 버그를 고치면 고치기 전에 실패하는 테스트를 함께 넣습니다.

## 5. 코드 스타일

- ESLint(`eslint-config-next` + jsx-a11y recommended).
- **TypeScript strict:** `tsconfig.json`에 `strict: true`. `any`·`as` 단언·`@ts-ignore`를 피하고 외부 입력은 검증합니다.
- **형식:** 표준과 다른 점: Prettier·Biome 설정과 format 스크립트가 없습니다. 주변 코드 모양을 따릅니다.
- 디자인 기준: 인트로는 `#8B0000` 중심의 적색 계열, 메인은 흑백만 씁니다. 글꼴은 OFL의 Inter·JetBrains Mono·Cormorant·우아한 세리프(줄인 파일 이름 GenesisSerif)만 씁니다. 참고 사이트의 모델·텍스처·로고·사진·유료 글꼴은 가져오지 않습니다.
- **접근성(WCAG 2.2·KWCAG 2.2):** 네이티브 요소 먼저, 텍스트 대비 4.5:1 이상, 키보드 조작과 보이는 초점(`outline: none` 단독 금지), 조작 크기 24×24px 이상, 입력 오류의 `aria-invalid`·`aria-describedby` 연결. 로딩 알림은 처음부터 있는 `role="status"` 영역의 글만 바꿉니다. 동작 줄이기에서는 WebGL 장면을 띄우지 않고, 정지 버튼으로 그리기를 멈출 수 있어야 합니다. 자동 검사는 `eslint-plugin-jsx-a11y`(recommended 전체), Playwright + axe E2E, Lighthouse 접근성 100입니다. Storybook은 접근성 애드온(`a11y: { test: 'error' }`)을 켜고, `e2e/storybook-a11y.spec.ts`가 모든 스토리를 axe로 검사해 위반이 있으면 실패합니다.
- 화면을 더하면 `sitemap`(`_app/seo`)에도 더합니다.

## 6. Git·PR

- **흐름: GitHub Flow.** `main`에 직접 커밋·푸시하지 않습니다. 최신 `main`에서 브랜치를 만들어 PR로만 병합하고, PR은 목적 하나로 작게 만들어 본문에 무엇·왜·검사 결과를 적습니다.
- **브랜치 이름:** `feat/…`, `fix/…`, `refactor/…`, `docs/…`, `test/…`, `chore/…`, `release/…`.
- **커밋 메시지: Conventional Commits**(`feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `style`, `chore`, `ci`, `build`) + 한국어 요약. 예: `feat: 전쟁 장면의 함대를 유성우(유성·혜성)로 1.1.0`, `fix: 세로로 긴 화면에서도 혜성이 보이게 1.1.1`. 표준과 다른 점: 이 저장소는 버전을 괄호 없이 끝에 붙여 왔습니다(예전에는 `(0.6.0)`도 씀). 문서만 바꾸면 버전 없이 `docs: …`.
- 커밋 작성자는 ryushin01(`ryushin0 <141554987+ryushin01@users.noreply.github.com>`)입니다. 백엔드 저장소가 아니므로 `Co-Authored-By` 줄은 넣지 않습니다.
- GitHub Actions가 커밋하는 워크플로를 만들면 커밋 작성자를 ryushin01로 설정합니다(`github-actions[bot]` 금지).
- Dependabot PR(`.github/dependabot.yml`)은 그대로 병합하지 않고, 같은 변경을 ryushin01 커밋으로 다시 만들어 PR로 병합합니다.
- **버전: Semantic Versioning(주.부.수).** 호환이 깨지면 주, 기능은 부, 수정·작은 개선은 수를 올립니다.
  - 버전은 `package.json`의 `version`과 README 버전 배지에서 함께 맞춥니다.
- **변경 기록: Keep a Changelog를 기준으로 하되 실제 형식을 따릅니다.**
  - 표준과 다른 점: `CHANGELOG.md`는 `## 1.1.1 - 2026-11-20` 제목 아래 한 줄 요약과 목록으로 적고 추가·변경·수정·제거로 나누지 않습니다. `[Unreleased]`는 쓰지 않고 버전을 올리는 PR에서 바로 그 버전 절을 더합니다.
- 병합은 squash(`제목 (#번호)`)입니다. CI가 통과하면 바로 병합하고 CodeRabbit 리뷰는 기다리지 않습니다.

## 7. 배포·릴리스

- Vercel 프로젝트 `genesis`(도메인 `zero.ryushin0.co.kr`). `vercel.json`의 `git.deploymentEnabled`로 **`main`만 운영 배포**하고 PR 미리보기 배포는 끕니다. 사이트와 Storybook(`/storybook`)이 함께 배포됩니다.
- 사용자가 배포일을 정해 두면 그 전에는 병합하지 않고 PR만 올려 둡니다.
- 릴리스: 병합 커밋(전체 SHA)에 태그 `vX.Y.Z`, GitHub 릴리스 제목 `vX.Y.Z`, 본문은 CHANGELOG 해당 절.
- 릴리스 뒤 백업 `bash ~/Documents/Archive/Backup/backup.sh`(DONE 확인), 보관함 계획 문서 `~/Documents/Obsidian Vault/Genesis v1.0.0 고도화 계획.md`에 날짜와 진행 기록. 소개가 크게 바뀌면 프로필 저장소 `ryushin01/ryushin01` README 표를 고칩니다.

## 8. 보안·주의사항

- 비밀값과 `.env*`는 커밋하지 않습니다. Sentry에는 오류 내용만 보내고 사용자 정보·쿠키·헤더·쿼리·세션·브레드크럼을 모으지 않습니다.
- 보안 헤더는 `next.config.ts`의 `headers()`에 있습니다. CSP는 정적 페이지를 지키려고 nonce 없이 씁니다. `'wasm-unsafe-eval'`(meshopt 디코더)과 `blob:`(glTF 텍스처)을 지우면 장면이 뜨지 않습니다. 새 외부 출처를 쓰면 CSP에 더합니다.
- 3D 모델(CC BY 4.0) 출처 표기는 README '출처' 표와 라이선스 원문에 있으며 지우지 않습니다.
- 상태(CI·배포·릴리스·주소)는 명령 결과(`gh run`, `curl` 등)로 확인한 것만 말합니다.
- 먼저 묻기: 새 런타임 의존성 추가, 빌드·배포 설정(`next.config.ts`의 CSP 포함, `vercel.json`, 워크플로) 변경.
- 절대 금지: 비밀값을 `NEXT_PUBLIC_*`에 넣기(`NEXT_PUBLIC_SENTRY_DSN`처럼 공개해도 되는 값만), `.env*` 커밋, `eslint-disable`·`--no-verify`로 검사 우회, `main`에 직접 푸시.
- `public/favicon.png`는 사이트 아이콘(`src/app/icon.png`)과 같아야 합니다(Paseo 아이콘 탐색용, 테스트가 확인).

## 9. 공통 규칙

규칙은 3계층입니다. 1층 전역(`~/.claude/CLAUDE.md`, OpenCode는 `~/.config/opencode/AGENTS.md`로 같은 파일) → 2층 ryushin01 공통(`~/Documents/GitHub/CLAUDE.md`, Claude Code만 읽음) → 3층 이 파일. 충돌하면 이 파일이 우선합니다. 2층을 읽지 못하는 도구를 위해 핵심을 아래에 요약합니다.

- 답변·커밋·PR·문서는 한국어로 씁니다.
- 허락을 묻지 않고 끝까지 진행한 뒤 결과를 한 번에 보고합니다. 비용·비밀값 생성·디자인 결정·되돌리기 어려운 일·다른 조직 저장소에 공개로 글 올리기는 진행 전에 보고하고 결정을 받습니다.
- 사용자의 진행 중인 작업을 보호합니다. 로컬에 커밋하지 않은 변경이나 원격에 없는 브랜치가 있으면 `git worktree add`로 따로 작업하고 끝나면 지웁니다.
- 기여자는 ryushin01만 남깁니다(커밋 작성자·`Co-Authored-By`·Actions·Dependabot 규칙은 6절).
- Vercel은 Hobby 요금제로 계정 전체 하루 100회 배포 한도가 있습니다. 배포가 많은 날은 버전 단위로 묶고, 한도에 걸리면 병합·릴리스까지만 하고 다음 날 반영합니다.
- 공개 데모에 실제 DB 접속 정보·유료 API 키·로컬 `.env` 값을 넣지 않고, 데모 모드가 꺼지면 원래 동작이 그대로여야 합니다.
- 병합 뒤 릴리스·백업·보관함 기록·프로필 README 갱신은 7절을 따릅니다.
- 다른 세션에 보내는 공지는 ryushin01 그룹 세션에만 보냅니다.
