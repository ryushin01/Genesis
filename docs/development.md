# 개발 가이드

## 작품 내용 바꾸기

| 내용 | 파일 |
|---|---|
| 인트로 문구, 구간 길이 | `src/_pages/intro/model/chapters.ts` |
| 인트로 첫 화면과 마지막 문구 | `src/_pages/intro/ui/IntroExperience.tsx` |
| 메인의 흐름, 기록 보관소 항목 | `src/_pages/main/ui/MainPage.tsx` |

인트로 문구와 메인 소개는 작품 요약에서만 뽑은 초안이고, 기록 보관소(세계관·인물·세력·연대기)는 "기록 준비 중"입니다. 1.0.0은 이 상태로 공개했고, 작가가 공개할 자료를 정해 주면 그 내용으로 바꿉니다. 작품 내용은 지어내지 않습니다. 기록 보관소를 채우면 `MainPage.test.tsx`의 "기록 준비 중" 테스트도 함께 고치고, 화면 글자가 늘면 `pnpm fonts`로 한글 글꼴 파일을 다시 만듭니다.

## 인트로 장면

- `model/timeline.ts`: 스크롤 진행도별 3D 카메라(불사조를 도는 각도·높이·거리, 바라보는 점)와 연출 값. 키 사이는 `model/curve.ts`의 단조 3차 곡선으로 이어 키에서 멈추거나 넘치지 않습니다. 문구 구간을 크게 바꾸면 함께 맞춥니다. 우주 장면(가운데 문구)은 카메라를 물려 불사조를 문구 위에 두고, 전쟁 장면(아래 문구)은 날개를 다 올려도 위가 잘리지 않게 둡니다. 세로 화면은 카메라와 바라보는 점을 함께 물려 같은 구도를 지킵니다.
- `model/assets.ts`: 모델 주소. 불사조 모델은 `ui/IntroPage.tsx`가 HTML에서 미리 받기 시작하고(동작 줄이기에서는 받지 않음), 깃털과 로고는 장면을 띄운 뒤에 받습니다.
- `public/models/phoenix.glb`: 불사조 모델. 원본에서 목의 오각별 장식(`Plane001`)을 빼고 양자화·meshopt로 압축했습니다. 날갯짓은 모델에 든 애니메이션을 재생하고, 빠르기는 타임라인의 `flapRate`를 따릅니다. 라이선스는 같은 폴더의 `phoenix-license.txt`입니다.
  - 텍스처는 WebP(`EXT_texture_webp`)입니다(약 1.2MB). 원본의 발광 텍스처는 기본 색 텍스처와 픽셀이 같아 기본 색 이미지를 함께 쓰고, 셰이더는 기본 색의 선형 휘도와 알파만 쓰므로 같은 휘도가 나오는 회색 + 무손실 알파로 담았습니다(품질 85). 노멀 맵은 near-lossless(60)입니다. 모델을 다시 만들 때는 PNG 텍스처 원본에 `node scripts/repack-phoenix.mjs <원본.glb> public/models/phoenix.glb`를 돌리고(형상·애니메이션의 meshopt 압축은 그대로 옮김), Khronos glTF Validator로 오류가 없는지 확인합니다.
- `public/models/feathers.glb`: 불사조가 태양에 닿아 터진 뒤의 깃털 2장(“Feathers” by victorberdugo1, CC BY 4.0). `extractFeather`가 부품을 합쳐 길이를 1로 맞춘 뒤 인스턴스로 그립니다. 작은 깃털은 흩어져 사라지고, 큰 깃털 하나가 진자처럼 흔들리며 화면 가운데로 내려오고 배경 셰이더가 빛 무리와 빛줄기를 그립니다.
- `public/models/phoenix-logo.glb`: 큰 깃털이 내려앉은 자리에 나타나는 로고(“Phoenix Logo” by Suraj-456tyu, CC BY 4.0). 색은 #8B0000 계열로 옮기고 빛을 받게 합니다.
- `lib/shaders.ts`: 불사조 재질에 끼워 넣는 조각(모든 색을 #8B0000 한 색조로, 불길, 역광 테두리와 대기·입자감으로 배경에 녹이기, 태양 속 소멸, 윤곽 패스), 깃털과 초신성, 배경(태양·우주·포화·불길 줄기), 유성우(유성·혜성), 불티, 불티 꼬리의 GLSL. 설명은 GLSL 안이 아니라 각 상수의 JSDoc에 씁니다(문자열 안의 주석은 번들에 그대로 실립니다).
- `lib/createPhoenixScene.ts`: 모델을 받고 장면을 묶어 그리는 순서를 정합니다. 불사조 윤곽을 1/3 해상도·밉맵으로 먼저 그린 뒤, 배경 셰이더가 그 윤곽으로 빛과 불길을 그립니다. 장면의 부품은 `lib/scene/`에 있습니다.

| `lib/scene/` | 내용 |
|---|---|
| `bird.ts` | 불사조 재질(깃털 가장자리는 alpha-to-coverage로 부드럽게), 날갯짓(날개 끝 높이를 재어 몸이 함께 오르내림) |
| `smoothClip.ts` | 날갯짓 클립 다듬기: 처음·끝 자세 이음매 맞추기, 성긴 키를 3차 곡선으로 이어 초당 120개로 다시 샘플, 한 번에 크게 휘두르는 순간 늦추기(`strokeEase`), 변하지 않는 트랙은 한 번만 적용하고 빼기 |
| `feathers.ts` | 터진 뒤의 작은 깃털과 큰 깃털(보일 때만 그림) |
| `logo.ts` | 마지막 로고 |
| `effects.ts` | 유성우(유성·혜성), 불티, 불사조 뒤의 불티 꼬리 |
| `backdrop.ts` | 화면 전체를 칠하는 배경 셰이더 |
| `disposer.ts` | 만든 자원을 모아 반대 순서로 한 번에 놓아 줌(늦게 받은 모델도) |

- 보이지 않는 것은 그리지 않습니다: 불사조가 태양 속으로 사라지면 날갯짓과 윤곽 패스를 건너뛰고, 유성우·깃털·로고는 그 장면에서만 그립니다. 셰이더는 장면을 띄울 때 `compileAsync`로 미리 준비하고, 준비가 끝난 뒤에 그리기를 시작합니다(`KHR_parallel_shader_compile`가 있으면 링크를 기다리며 메인 스레드를 막지 않음). 늦게 받는 깃털·로고도 준비가 끝난 뒤 장면에 넣습니다.
- 장면 준비(WebGL 컨텍스트 만들기 → 불사조와 날갯짓 다듬기 → 셰이더 준비)는 단계 사이에 `yieldToMain`(`scheduler.yield`, 없으면 `setTimeout`)으로 브라우저에 틈을 줘 긴 작업 하나로 몰리지 않게 합니다. 단계 사이에 화면을 떠났으면 남은 준비를 하지 않고 만든 자원을 놓아 줍니다.
- 스크롤 진행도와 포인터는 `model/follow.ts`의 2차(임계 감쇠) 추종기로 따라갑니다. 휠 한 칸처럼 목표가 계단으로 바뀌어도 속도가 튀지 않고, 프레임 간격이 달라도 같은 궤적을 그립니다.
- 정지 버튼을 누르면 스크롤·포인터를 따라잡은 뒤 그리기를 멈추고, 다음 입력이 오면 다시 그립니다. 루트의 `data-paused`로 CSS 애니메이션(스크롤 안내 선)도 멈춥니다. 버튼은 화면 왼쪽 아래에 고정되어 있지만 DOM에서는 머리글 바로 뒤라 키보드로 이야기보다 먼저 닿습니다.
- 동작 줄이기 설정을 페이지를 연 채로 껐다 켜면 장면을 다시 만듭니다. 이때 로딩 상태를 처음으로 돌리고, 정지해 둔 상태는 새 장면에 넘깁니다.
- 로딩 알림은 처음부터 있는 `role="status"` 영역(`VisuallyHidden`)의 글만 바꿉니다. 보이는 로딩 화면은 같은 내용이라 `aria-hidden`입니다.
- 문구의 투명도와 `will-change`는 `.sticky` 안쪽 요소에만 둡니다. 화면 전체 크기의 `.sticky`에 두면 장이 바뀔 때마다 큰 레이어를 새로 래스터해 프레임이 밀립니다.
- 프레임이 계속 34fps 아래로 떨어지면 렌더링 해상도를 단계적으로 낮춥니다(첫 프레임들은 빼고 잼). 캔버스는 `100lvh`로 고정해 모바일 주소창이 움직여도 그리기 버퍼를 다시 만들지 않습니다.
- 장면을 닫으면 모든 자원을 놓아 주고 WebGL 컨텍스트도 바로 놓습니다(`forceContextLoss`). 장면을 띄우기 전에 화면을 떠나면 받던 모델도 멈춥니다.

동작 줄이기 설정에서는 장면을 띄우지 않고, WebGL을 쓸 수 없으면 CSS 배경과 글자만 보여 줍니다.

## 디자인 기준

- 인트로는 프라이머리 `#8B0000`을 중심으로 한 적색 계열입니다. 메인은 흑백만 씁니다.
- 3D 모델은 모두 CC BY 4.0입니다: “Phoenix” by NORBERTO-3D, “Feathers” by victorberdugo1, “Phoenix Logo” by Suraj-456tyu. 작품명·작가·라이선스와 변경 사항은 README의 '출처' 표에 두고, 인트로 끝과 메인 바닥글에는 그 표로 가는 링크만 둡니다. 라이선스 원문은 `public/models/*-license.txt`에 둡니다. 표기를 지우지 않습니다.
- 참고 사이트의 모델, 텍스처, 로고, 사진, 유료 글꼴은 저작물이므로 가져오지 않습니다. 글꼴은 OFL 라이선스의 Inter, JetBrains Mono, Cormorant(영문 제목은 기울임, 한글 서사 문장 속 영문은 똑바른 Bold), 우아한 세리프(한글)를 씁니다. 모두 저장소 파일이며 외부 글꼴 CDN이나 `next/font/google`은 쓰지 않습니다.
- 한글은 화면에 쓰는 글자만 담은 우아한 세리프 파일을 첫 화면 CSS와 함께 받고, 나머지 글자는 조각으로 나눠 나중에 붙입니다. 문구를 바꾸면 `pnpm fonts`로 다시 만듭니다(빠진 글자는 단위 테스트가 잡음). 예약 글꼴 이름이 있어 줄인 파일의 이름은 GenesisSerif로 바꾸고, 라이선스 원문(`LICENSE.txt`)을 파일 옆에 둡니다.
- 한글 서사 문장(토큰 `fonts.narrative`: 메인 서사, 인트로 장 문장) 속 영문·숫자는 Cormorant 똑바른 Bold를 `size-adjust: 136%`로 키워 씁니다. 우아한 세리프 한글은 글자 면을 꽉 채워(높이 1em) Cormorant 대문자(0.625em)만으로는 작고 가늘어 보이기 때문입니다.

## 스타일(StyleX)

컴포넌트 스타일은 [StyleX](https://stylexjs.com)(`@stylexjs/stylex`)로 씁니다. `stylex.create`로 만든 스타일을 `stylex.props`로 요소에 붙이고, 빌드할 때 원자 단위 CSS 파일로 뽑아내므로 실행 중에 `<style>`을 넣지 않습니다.

- **빌드 설정:** 옵션은 `stylex.config.mjs` 한 곳에 있습니다.
  - Next(Turbopack): `next.config.ts`의 `turbopack.rules`가 StyleX를 가져오는 저장소 파일에만 `babel-loader`(StyleX Babel 플러그인만)를 걸고, JSX·TS 변환과 압축은 그대로 SWC가 합니다. CSS는 `postcss.config.mjs`의 `@stylexjs/postcss-plugin`이 `globals.css`의 `@stylex` 자리에 넣습니다(StyleX 공식 Next 안내의 Babel + PostCSS 방식).
  - Babel 설정 파일(`.babelrc`, `babel.config.*`)은 두지 않습니다. `package.json`이 `"type": "module"`이라 `babel.config.js`를 쓸 수 없고 Next는 `.cjs`·`.mjs` 설정을 읽지 못하며, JSON 설정을 두면 Storybook의 react-docgen과 unplugin도 그 설정을 읽어 타입스크립트를 못 읽거나 StyleX 변환을 두 번 합니다.
  - Storybook·Vitest(Vite): `@stylexjs/unplugin`이 코드를 바꿉니다. Storybook 빌드에서는 unplugin이 CSS를 붙이고(PostCSS의 StyleX는 끔), 개발 서버에서는 PostCSS가 넣습니다.
- **토큰:** `src/shared/ui/tokens.stylex.ts`의 `stylex.defineVars`(색 `colors`, 글꼴 `fonts`, 간격 `space`, 글자 크기 `fontSizes`). StyleX가 빌드할 때 변수 이름을 알아야 하므로 이 파일은 `shared/ui`의 index로 다시 내보내지 않고 `@/shared/ui/tokens.stylex`에서 바로 가져옵니다.
- **테마:** `src/shared/ui/themes.ts`의 `stylex.createTheme`. 검은 바탕 반전(`invertedTheme`: 메인 구조·기록 구역, 메뉴, 본문 바로가기, 카드 그림), 반전 안의 흰 종이(`paperTheme`: 구조 카드), 인트로 적색(`introTheme`). 색은 `colors.background`·`foreground`·`muted`로 쓰고, 테마를 붙인 요소 아래에서는 같은 이름이 테마 값이 됩니다.
- **조건:** 미디어 쿼리·`:hover`·`:focus-visible`·`prefers-reduced-motion`·`@supports`는 속성 값 안의 조건(`{ default, '@media …': … }`)으로 씁니다. 스크롤 타임라인 연출(`animation-timeline`, `view-timeline`)과 `@keyframes`도 `stylex.keyframes`와 긴 이름 속성(`animationName` 등)으로 씁니다. 단축 속성 `animation`·`background`·`border`는 StyleX가 받지 않아 긴 이름으로 나눕니다.
- **자식 선택자 없음:** StyleX는 `.a b` 같은 자손 선택자를 쓰지 않습니다. 스타일은 요소마다 붙이고(예: 알림 화면의 링크·버튼은 `NoticeLink`·`NoticeButton`), 조상의 상태는 `stylex.when.ancestor`(인트로의 `data-near`)로 봅니다.
- **전역 CSS로 남긴 것(`src/_app/styles/globals.css`):** 한글 글꼴 `@font-face`(요소 스타일이 아님)와 요소 선택자 초기화(`*`, `body`, `h1`… 태그 선택자). 초기화는 `@layer reset`에 넣어, 레이어(`priority1`~) 안에 들어가는 StyleX 스타일이 언제나 이기게 합니다. `<body>`의 바탕·글꼴은 `src/_app/styles/document.ts`(StyleX)를 루트 레이아웃과 Storybook 미리보기가 붙입니다.

## TypeScript 버전

`typescript-eslint`가 TypeScript 7을 지원하지 않아 6으로 고정했습니다.

## E2E

WebGL 장면을 GPU 없이 그리므로 Playwright는 작업자 1개로 돌립니다. 프로덕션 서버는 3210 포트에 띄우고, 같은 기기의 다른 앱이 그 포트를 쓰고 있으면 `E2E_PORT=3290 pnpm e2e`처럼 바꿉니다. 데스크톱에서는 인트로와 메인을 두 번 오간 뒤 살아 있는 WebGL 컨텍스트가 0개이고 그리기 루프(rAF)도 멈췄는지 확인합니다. 첫 왕복에서는 매 프레임 메인 스레드를 40ms씩 붙잡아 해상도 자동 조절이 일어난 뒤에 떠납니다(조절하며 루프가 둘로 갈라지면 하나가 남던 문제의 회귀 검사). 이 검사만 화면을 800×500으로 줄여 GPU 없는 CI에서도 15초 안팎에 끝납니다. 이 검사가 부하가 큰 기기에서 가끔 메인으로 넘어가지 못하고 시간을 넘기던 원인은, 링크를 누른 뒤에도 장면이 매 프레임 메인 스레드를 붙잡아 화면 전환(주소 바뀜)이 몇 초씩 밀린 것이었습니다. 1.3.2부터 메인으로 들어가는 링크를 누르면 장면 그리기부터 멈춥니다(`PhoenixScene.stop`, 마지막 그림은 남음).

### 오프라인 검사

`e2e/offline.spec.ts`는 사이트 밖으로 나가는 요청을 모두 끊고(`route.abort`) `.env` 없이 만든 프로덕션 빌드로 모든 화면과 주요 상태가 내용과 함께 뜨는지 봅니다. 바깥으로 나간 요청과 처리하지 못한 화면 오류(`pageerror`)가 하나도 없어야 통과하고, 화면마다 axe 검사와 글꼴(모두 저장소에서 받았는지)도 함께 봅니다. 포트폴리오로 보여 줄 때 외부 서비스가 끊겨도 화면이 그대로여야 하므로 바깥 자료를 새로 쓰면 저장소에 넣습니다.

| 화면·상태 | 확인하는 것 |
| --- | --- |
| 인트로 3D 장면(데스크톱) | 장면이 뜨고 정지 버튼으로 멈춤, 첫 장·네 장·끝 장면의 글이 차례로 다 나타남, 메인 링크 |
| 인트로 깃털·로고 모델 실패(데스크톱) | 불사조 장면과 끝 장면은 그대로 |
| 인트로 모델 받는 중 → 실패 | 로딩 알림(`role="status"`)과 0%, 실패하면 알림이 비고 정지 버튼 없이 적색 CSS 배경과 모든 장의 글 |
| 인트로 동작 줄이기 | 캔버스 없이 CSS 배경과 모든 장의 글 |
| 메인 | 서사·세 개의 흐름·기록 보관소 구역의 스크롤 연출 글이 나타나고 끝 문구·바닥글 링크, 메뉴 열기·구역 이동, 인트로로 돌아가기 |
| 404 · 오류 화면 | 404 상태와 안내·링크. 오류 경계는 정적 사이트에서 일부러 일으킬 수 없어 같은 컴포넌트를 함께 배포한 Storybook(`app-errorpage--default`)으로 엶. 루트 오류 화면(`global-error`)은 시스템 글꼴과 인라인 스타일만 써서 바깥 자료가 없음(단위 테스트) |
| Storybook | 함께 배포한 Storybook의 미리보기가 그려짐 |

**배포본:** `pnpm e2e:deployed`는 같은 검사를 운영 주소(`https://zero.ryushin0.co.kr`)에 돌립니다. 다른 배포는 `E2E_BASE_URL=https://… pnpm e2e:deployed`로 바꿉니다. 이때는 로컬 서버를 띄우지 않고, 그 배포의 출처만 열고 나머지 바깥 요청을 모두 끊습니다.

| 바깥 의존 | 처리 |
| --- | --- |
| 라틴 글꼴(Inter·JetBrains Mono·Cormorant 기울임) | `next/font/google` 대신 `next/font/local`로 저장소 파일(`src/_app/styles/fonts`, Fontsource 라틴 조각, OFL)을 씀. 빌드할 때도 네트워크가 필요 없음 |
| 한글 글꼴·3D 모델·Storybook | 원래 저장소(`src/_app/styles/fonts`, `public/fonts`, `public/models`, `public/storybook`)에 있음 |
| Sentry·web-vitals | DSN이 없으면 Sentry를 번들에 넣지 않음. DSN이 있어도 보내기 실패는 화면에 영향이 없음 |

### 시각 회귀

`e2e/visual.spec.ts`가 화면을 기준 이미지(`e2e/__screenshots__/desktop/` 41장, `mobile/` 38장)와 픽셀 단위로 비교합니다(`maxDiffPixels: 0`, `threshold: 0`). 인트로 각 장·끝 장면(장면 없이 CSS 배경)·호버·초점, 로딩 화면, 정지 버튼(장면을 띄운 뒤 캔버스만 숨김), 동작 줄이기, 메인 각 구역·스크롤 연출·바로가기·메뉴, 404, Storybook의 오류·알림·메뉴 스토리입니다. WebGL 캔버스는 GPU·드라이버마다 그림이 달라 비교하지 않습니다.

- 찍는 브라우저는 로컬·CI 모두 Playwright 공식 Docker 이미지(`mcr.microsoft.com/playwright:v<버전>-noble`)입니다. `pnpm visual:docker`가 그 이미지에서 브라우저 서버(run-server)만 띄우고, 테스트와 E2E 서버는 이 기기에서 돌려 그 브라우저에 붙습니다. 같은 Linux라도 CI 러너의 브라우저로 찍으면 그러데이션·글자가 달라(화면의 최대 48%) 이렇게 맞췄습니다. 그러데이션은 CPU 종류마다 래스터 결과도 달라(같은 이미지라도 ARM과 x86의 인트로 화면이 44% 다름) `linux/amd64` 이미지를 씁니다. Apple Silicon에서는 colima를 `colima start --arch x86_64`(또는 `--vz-rosetta`)로 켭니다. 기준 이미지는 CI에서 찍은 것입니다(실패한 실행의 `reports`에 있는 `*-actual.png`).
- 그래서 Playwright 프로젝트 `visual-desktop`·`visual-mobile`은 그 브라우저에 붙을 때만 켜지고, 그냥 `pnpm e2e`에서는 건너뜁니다. `pnpm check`는 E2E 다음 단계로 `pnpm visual:docker`를 부르므로 Docker(colima 가능)가 켜져 있어야 합니다. 기준을 새로 만들 때는 `pnpm visual:docker --update-snapshots`. 다 쓰면 `colima stop`으로 끕니다(다른 작업의 컨테이너가 없는지 먼저 확인).
- 화면을 일부러 바꿨으면 기준 이미지를 다시 만들어 같은 PR에 넣습니다. CI에서 실패하면 실행의 `reports` 결과물(7일 보관)에 차이 이미지(`*-diff.png`)와 실제 이미지가 있습니다.

### 성능(3D 인트로)

Lighthouse는 장면이 뜨기 전에 재므로 `e2e/performance.spec.ts`가 장면을 띄운 뒤를 잽니다. web-vitals(앱과 같은 라이브러리)로 LCP·CLS·INP(정지 버튼)를 받고, 4초 동안 끝까지 스크롤하며 프레임 간격을 모읍니다(데스크톱 1440×900).

| 지표 | 기준 | CI에서 잰 값(1.3.2) |
|---|---|---|
| LCP · CLS | Web Vitals '좋음' 2.5초 · 0.1 | 112ms · 0.0026 |
| INP(정지 버튼) | 2초 이하 | 928ms |
| 프레임 간격 중앙값 · 가장 긴 프레임 | 800ms · 1.5초 이하 | 383ms · 483ms |

CI는 GPU 없이 소프트웨어로 그려 한 프레임이 수백 ms이므로 INP·프레임은 실제 기기 기준(200ms, 60fps)을 쓸 수 없어, CI 값의 약 2배를 회귀 상한으로 둡니다(해상도 자동 조절이 깨지거나 메인 스레드를 오래 붙잡는 변경을 잡음). 잰 값은 테스트 주석(`측정`)과 로그에 남습니다.

### 접근성 검사 범위

axe는 모든 화면·상태를 봅니다: `site.spec.ts`(동작 줄이기 인트로, 메인, 404), `offline.spec.ts`(3D 장면 끝 장면, 모델 실패 CSS 배경, 동작 줄이기, 메인, 메뉴 열림, 404, 오류 화면), `storybook-a11y.spec.ts`(Storybook의 모든 스토리, `index.json`에서 목록을 읽음). Storybook에는 접근성 애드온(`@storybook/addon-a11y`)을 켜고 `a11y: { test: 'error' }`로 위반을 오류로 다룹니다.

## 단위 테스트 커버리지

`pnpm test:coverage`(Vitest + `@vitest/coverage-v8`)는 `src`의 모든 소스(테스트·스토리 제외)를 잽니다. 기준은 `vitest.config.ts`에 있습니다.

| 묶음 | 기준 |
|---|---|
| 로직 계층: `shared/lib`, `*/model`, `*/api`, 장면 모델 받기·진행률(`intro/lib/fetchModel.ts`) | 문장·분기·함수·줄 80% 이상 |
| 전체 | 기준선(1.3.2에서 잰 값의 내림: 문장 53·분기 54·함수 61·줄 52%) 이상 |

WebGL 장면(`createPhoenixScene.ts`, `lib/scene/*`의 일부)은 jsdom에서 그릴 수 없어 E2E가 봅니다. 테스트를 더해 전체가 오르면 기준선도 함께 올립니다. `node scripts/coverage-summary.mjs`가 묶음별 표를 찍고, CI에서는 실행의 Summary에 붙입니다.

## CI와 `pnpm check`

`pnpm check`(`scripts/check.mjs`)가 CI와 같은 검사를 같은 순서로 돌립니다: 린트 → FSD → 타입 → 단위·커버리지 → 커버리지 요약 → 빌드(Storybook + Next) 한 번 → E2E(`E2E_PREBUILT=1`로 그 빌드를 다시 씀) → 시각 회귀(`pnpm visual:docker`) → 크기 → Lighthouse. CI(`.github/workflows/ci.yml`)는 이 스크립트 하나를 부릅니다. 로컬에서는 Lighthouse 결과를 바깥에 올리지 않고 `.lighthouseci`에 저장합니다. 장비가 바쁘면 `E2E_PORT`로 빈 포트를 씁니다.

- 캐시: pnpm 저장소(`setup-node`), Playwright 브라우저(`~/.cache/ms-playwright`, Playwright 버전마다. 있으면 시스템 라이브러리만 설치), `.next/cache`(잠금 파일·소스 해시). 토큰이 필요한 원격 캐시는 쓰지 않습니다.
- 같은 PR에 새로 푸시하면 이전 실행을 취소합니다(`concurrency`). 문서(`*.md`, `docs/`)만 바뀌면 `changes` 작업이 `check`를 건너뜁니다(건너뛴 작업은 필수 검사에서 통과로 침).
- 실패했을 때만 `reports` 결과물(Playwright HTML 리포트·차이 이미지·트레이스, 커버리지, Lighthouse)을 올리고 7일 보관합니다.

## 디자인 시스템(Storybook) 배포

`pnpm build`는 Storybook을 먼저 `public/storybook`에 빌드한 뒤 사이트를 빌드합니다. 그래서 사이트와 같은 주소의 `/storybook`에 함께 배포되고, 메인 화면 바닥글의 **디자인 시스템(Storybook)** 링크로 들어갑니다.

- `/storybook`은 정적 파일 폴더라 `/storybook/index.html`로 보냅니다(`next.config.ts`의 `redirects`).
- `pnpm build-storybook`(앱 빌드가 먼저 부르는 스크립트)으로 빌드할 때는 `public`을 복사하지 않습니다. 같은 주소에서 열리므로 파일은 사이트의 것을 씁니다.
- 개발 서버(`pnpm dev`)에서는 링크가 Storybook 개발 서버(`http://localhost:6006`)로 갑니다.
- Paseo처럼 프로젝트 아이콘을 자동으로 찾는 도구는 `src/`를 보지 않고 `public/`을 하위 폴더까지 뒤지므로, 그대로 두면 `public/storybook/favicon.svg`(Storybook 로고)를 고릅니다. 그래서 `public/` 바로 아래에 사이트 아이콘(`src/app/icon.png`)과 같은 `favicon.png`를 둡니다(사이트는 쓰지 않음). 아이콘을 바꾸면 함께 복사하고, `src/app/public-favicon.test.ts`가 두 파일이 같은지 확인합니다.

## 품질 예산

- **번들 크기:** `pnpm size`가 방문자가 실제로 받는 파일만 나눠 잽니다(gzip). 기준은 `.size-limit.mjs`에 있습니다.

  | 묶음 | 기준 | 무엇을 재나 |
  |---|---|---|
  | 첫 화면 JS: 인트로 `/` · 메인 `/main` | 155 kB · 150 kB | 빌드한 HTML(`.next/server/app/*.html`)이 처음에 받는 스크립트. 모던 브라우저가 받지 않는 noModule 폴리필은 뺌 |
  | 인트로 장면(three.js) | 185 kB | 동작 줄이기를 끄고 인트로에 들어왔을 때 늦게 받는 장면 청크 |
  | Sentry | 32 kB | DSN이 있을 때만 첫 화면 뒤에 받는 청크(DSN이 없어도 빌드에는 생김) |
  | CSS | 8 kB | 모든 CSS |

  예전에는 모든 청크를 더해 "전체 JS 400 kB"로 쟀는데, 받지 않는 폴리필(39 kB)과 Sentry(30 kB)까지 들어가 실제 비용과 달랐고 여유도 0.02 kB뿐이었습니다.
- **Lighthouse:** `pnpm lhci`가 메인이 데스크톱 기준 성능 90·접근성 100·권장 사항 95·SEO 90점, LCP 2.5초·TBT 200ms·CLS 0.1 이하인지 3번씩 재서 확인합니다. 기준은 `lighthouserc.json`에 있습니다.
- **README 스크린샷:** 인트로 화면 캡처(`docs/images/intro-*.jpg`)는 프로덕션 서버를 띄운 뒤 `pnpm screenshots [주소]`(기본 `http://localhost:3210`)로 다시 만듭니다. 로고나 인트로 화면을 바꾸면 함께 찍습니다.
- **접근성 린트:** `eslint-config-next`는 jsx-a11y 규칙을 몇 개만 켭니다. 플러그인은 이미 등록되어 있어 `eslint.config`에서 recommended 규칙만 더해 모두 켭니다.

인트로(`/`)는 three.js WebGL 장면이라 GPU가 없는 CI에서는 소프트웨어로 그려 TBT가 40초까지 나옵니다(GPU가 있는 기기에서는 20ms 안팎). 그래서 인트로는 접근성·권장 사항·SEO·CLS만 검사하고, 성능 점수와 LCP·TBT는 메인(`/main`)에서 검사합니다.

두 검사 모두 프로덕션 빌드가 먼저 있어야 하며, CI는 빌드 뒤에 돌립니다.

## 오류·404 화면

- 없는 주소는 `_pages/not-found`, 화면을 그리다 난 오류는 `_app/errors/error-page`의 `ErrorPage`(`error.tsx`), 루트 레이아웃까지 실패하면 `_app/errors/global-error`의 `GlobalError`(`global-error.tsx`)가 보여 줍니다. 앞의 둘은 메인 맺음 구역의 흑백 디자인을 담은 `shared/ui`의 `NoticeScreen`과 그 링크·버튼(`NoticeLink`·`NoticeButton`)을 함께 씁니다.
- 오류 화면은 `reportError`로 Sentry에 보내고(DSN이 있을 때), "다시 시도"는 Next 16의 `retry`(서버 컴포넌트를 다시 받고 오류 경계를 되돌림)를 부릅니다.
- 두 화면의 링크는 `next/link` 대신 `<a>`(`NoticeLink`)입니다. 404 화면은 모든 페이지의 RSC 데이터에 함께 실려 `next/link`를 쓰면 그 코드(약 3 kB)가 모든 페이지의 첫 화면 JS에 더해지고, 오류 뒤에는 페이지를 다시 받아 상태를 새로 시작하는 편이 낫습니다. `error.tsx`·`global-error.tsx`는 서로의 코드를 싣지 않게 `_app/errors`의 `error-page`·`global-error`를 따로 가져옵니다.
- `GlobalError`는 전역 CSS와 글꼴이 없는 상태라 인라인 스타일로 그립니다. `<html>`부터 그려 스토리는 두지 않고, 테스트는 정적 마크업으로 확인합니다.

## 보안 헤더

`next.config.ts`의 `headers()`가 모든 응답에 붙입니다. E2E가 모든 테스트에서 CSP 위반 콘솔 오류가 없는지 확인합니다.

- CSP는 nonce 없이 씁니다. nonce를 쓰면 요청마다 페이지를 그려야 해서 정적 페이지(`○ Static`)를 잃습니다. 대신 다른 출처의 스크립트, 플러그인(`object-src`), `base`·폼 전송 주소, 프레임 끼워 넣기를 막습니다.
- `'wasm-unsafe-eval'`: 불사조 모델의 meshopt 압축을 푸는 디코더가 WebAssembly입니다. 지우면 장면이 뜨지 않고 CSS 배경으로 바뀝니다.
- `blob:`(`img-src`·`connect-src`): glTF 안의 텍스처를 blob 주소로 만들어 읽습니다.
- Sentry 수집 주소는 `NEXT_PUBLIC_SENTRY_DSN`이 있을 때 그 호스트만 `connect-src`에 더합니다.
- 개발 서버에서만 `'unsafe-eval'`과 `ws:`를 엽니다. `upgrade-insecure-requests`는 Vercel 배포에서만 씁니다.
- `/storybook`은 미리보기를 같은 출처 iframe으로 띄우므로 `frame-ancestors 'self'`·`X-Frame-Options: SAMEORIGIN`, 내장 글꼴 `data:`를 허용합니다.
- 다른 출처의 스크립트·글꼴·연결을 새로 쓰면 CSP에 그 출처를 더해야 합니다.

## 검색·공유

- `metadataBase`는 `shared/config`의 `SITE_URL`입니다. 페이지마다 `alternates.canonical`만 정하고, Open Graph·Twitter 카드는 루트 레이아웃에 둡니다(페이지가 `openGraph`를 정하면 레이아웃 값을 통째로 덮습니다).
- 공유 그림 `src/app/opengraph-image.jpg`(1200×630)는 인트로 첫 화면 캡처(`docs/images/intro-hero.jpg`)에서 조작 버튼이 없는 위쪽을 잘라 줄인 것입니다. `pnpm screenshots`가 캡처 뒤에 함께 만들고, 따로는 `pnpm og-image`로 만듭니다. 대체 텍스트는 `opengraph-image.alt.txt`입니다.
- `robots.txt`(`/storybook/` 제외)와 `sitemap.xml`(`/`, `/main`)은 `_app/seo`에 있고, `src/app/robots.ts`·`sitemap.ts`는 다시 내보내기만 합니다. 화면을 더하면 sitemap에도 더합니다.

## 모니터링

브라우저에서 화면을 그리기 전에 모니터링을 켜고, Sentry와 web-vitals는 나중에 따로 받습니다.

| 환경 변수 | 내용 |
| --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | 있으면 처리하지 못한 오류와 나쁜(poor) Web Vitals를 Sentry로 보냅니다. 없으면 Sentry를 번들에 넣지 않고, 개발 모드에서 Web Vitals를 콘솔에만 찍습니다 |

- Sentry에는 오류 내용만 보내고 사용자 정보·쿠키·헤더·쿼리 문자열, 방문 기록(세션), 이동·클릭 기록(브레드크럼), 콘솔 기록은 모으지 않습니다. Sentry를 받기 전에 난 오류는 모아 두었다가 처리되지 않은 오류로 보냅니다.
- 쓰는 함수만 `sentry.ts`에서 다시 내보내 약 31 kB(gzip)로 받습니다. 모듈 전체를 불러오면 리플레이·피드백까지 들어가 140 kB가 됩니다.
- 브라우저 오류만 모읍니다. 서버에서 난 오류는 호스팅(Vercel 등)의 로그로 확인합니다.

## 의존성 갱신 (Dependabot)

`.github/dependabot.yml`이 npm 패키지는 매주 부 버전·패치를 한 PR로 묶어 올리고, GitHub Actions는 매달 올립니다. 주 버전은 따로 PR이 열리므로 변경 내역을 확인하고 CI가 통과할 때만 병합합니다.

개발 도구가 끌어오는 하위 의존성의 취약점은 상위 패키지를 올려도 풀리지 않으면 `pnpm-workspace.yaml`의 `overrides`로 고친 버전을 씁니다(이유를 주석으로 남김). 상위 패키지가 고친 범위를 쓰게 되면 그 줄을 지웁니다. `pnpm audit`으로 확인합니다.

## PR 미리보기 배포

Vercel의 하루 배포 한도를 아끼려고 PR 미리보기 배포를 껐습니다(`vercel.json`의 `git.deploymentEnabled`). `main`에 머지할 때만 운영으로 배포하고, PR에서는 CI 검사만 돕니다. 미리보기가 꼭 필요하면 그 브랜치를 `deploymentEnabled`에 잠시 넣습니다.
