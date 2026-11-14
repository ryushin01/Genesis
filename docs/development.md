# 개발 가이드

## 작품 내용 바꾸기

| 내용 | 파일 |
|---|---|
| 인트로 문구, 구간 길이 | `src/_pages/intro/model/chapters.ts` |
| 인트로 첫 화면과 마지막 문구 | `src/_pages/intro/ui/IntroExperience.tsx` |
| 메인의 흐름, 기록 보관소 항목 | `src/_pages/main/ui/MainPage.tsx` |

인트로 문구와 메인 소개는 작품 요약에서만 뽑은 초안입니다. 소설 자료를 받으면 그 내용으로 바꿉니다.

## 인트로 장면

- `model/timeline.ts`: 스크롤 진행도별 3D 카메라(불사조를 도는 각도·높이·거리, 바라보는 점)와 연출 값. 키 사이는 `model/curve.ts`의 단조 3차 곡선으로 이어 키에서 멈추거나 넘치지 않습니다. 문구 구간을 크게 바꾸면 함께 맞춥니다. 우주 장면(가운데 문구)은 카메라를 물려 불사조를 문구 위에 두고, 전쟁 장면(아래 문구)은 날개를 다 올려도 위가 잘리지 않게 둡니다. 세로 화면은 카메라와 바라보는 점을 함께 물려 같은 구도를 지킵니다.
- `model/assets.ts`: 모델 주소. 불사조 모델은 `ui/IntroPage.tsx`가 HTML에서 미리 받기 시작하고(동작 줄이기에서는 받지 않음), 깃털과 로고는 장면을 띄운 뒤에 받습니다.
- `public/models/phoenix.glb`: 불사조 모델. 원본에서 목의 오각별 장식(`Plane001`)을 빼고 양자화·meshopt로 압축했습니다. 날갯짓은 모델에 든 애니메이션을 재생하고, 빠르기는 타임라인의 `flapRate`를 따릅니다. 라이선스는 같은 폴더의 `phoenix-license.txt`입니다.
  - 텍스처는 WebP(`EXT_texture_webp`)입니다(약 1.2MB). 원본의 발광 텍스처는 기본 색 텍스처와 픽셀이 같아 기본 색 이미지를 함께 쓰고, 셰이더는 기본 색의 선형 휘도와 알파만 쓰므로 같은 휘도가 나오는 회색 + 무손실 알파로 담았습니다(품질 85). 노멀 맵은 near-lossless(60)입니다. 모델을 다시 만들 때는 PNG 텍스처 원본에 `node scripts/repack-phoenix.mjs <원본.glb> public/models/phoenix.glb`를 돌리고(형상·애니메이션의 meshopt 압축은 그대로 옮김), Khronos glTF Validator로 오류가 없는지 확인합니다.
- `public/models/feathers.glb`: 불사조가 태양에 닿아 터진 뒤의 깃털 2장(“Feathers” by victorberdugo1, CC BY 4.0). `extractFeather`가 부품을 합쳐 길이를 1로 맞춘 뒤 인스턴스로 그립니다. 작은 깃털은 흩어져 사라지고, 큰 깃털 하나가 진자처럼 흔들리며 화면 가운데로 내려오고 배경 셰이더가 빛 무리와 빛줄기를 그립니다.
- `public/models/phoenix-logo.glb`: 큰 깃털이 내려앉은 자리에 나타나는 로고(“Phoenix Logo” by Suraj-456tyu, CC BY 4.0). 색은 #8B0000 계열로 옮기고 빛을 받게 합니다.
- `lib/shaders.ts`: 불사조 재질에 끼워 넣는 조각(모든 색을 #8B0000 한 색조로, 불길, 역광 테두리와 대기·입자감으로 배경에 녹이기, 태양 속 소멸, 윤곽 패스), 깃털과 초신성, 배경(태양·우주·포화·불길 줄기), 함대, 불티, 불티 꼬리의 GLSL. 설명은 GLSL 안이 아니라 각 상수의 JSDoc에 씁니다(문자열 안의 주석은 번들에 그대로 실립니다).
- `lib/createPhoenixScene.ts`: 모델을 받고 장면을 묶어 그리는 순서를 정합니다. 불사조 윤곽을 1/3 해상도·밉맵으로 먼저 그린 뒤, 배경 셰이더가 그 윤곽으로 빛과 불길을 그립니다. 장면의 부품은 `lib/scene/`에 있습니다.

| `lib/scene/` | 내용 |
|---|---|
| `bird.ts` | 불사조 재질(깃털 가장자리는 alpha-to-coverage로 부드럽게), 날갯짓(날개 끝 높이를 재어 몸이 함께 오르내림) |
| `smoothClip.ts` | 날갯짓 클립 다듬기: 처음·끝 자세 이음매 맞추기, 성긴 키를 3차 곡선으로 이어 초당 120개로 다시 샘플, 한 번에 크게 휘두르는 순간 늦추기(`strokeEase`), 변하지 않는 트랙은 한 번만 적용하고 빼기 |
| `feathers.ts` | 터진 뒤의 작은 깃털과 큰 깃털(보일 때만 그림) |
| `logo.ts` | 마지막 로고 |
| `effects.ts` | 함대, 불티, 불사조 뒤의 불티 꼬리 |
| `backdrop.ts` | 화면 전체를 칠하는 배경 셰이더 |
| `disposer.ts` | 만든 자원을 모아 반대 순서로 한 번에 놓아 줌(늦게 받은 모델도) |

- 보이지 않는 것은 그리지 않습니다: 불사조가 태양 속으로 사라지면 날갯짓과 윤곽 패스를 건너뛰고, 함대·깃털·로고는 그 장면에서만 그립니다. 셰이더는 장면을 띄울 때 미리 컴파일합니다.
- 스크롤 진행도와 포인터는 `model/follow.ts`의 2차(임계 감쇠) 추종기로 따라갑니다. 휠 한 칸처럼 목표가 계단으로 바뀌어도 속도가 튀지 않고, 프레임 간격이 달라도 같은 궤적을 그립니다.
- 정지 버튼을 누르면 스크롤·포인터를 따라잡은 뒤 그리기를 멈추고, 다음 입력이 오면 다시 그립니다.
- 문구의 투명도와 `will-change`는 `.sticky` 안쪽 요소에만 둡니다. 화면 전체 크기의 `.sticky`에 두면 장이 바뀔 때마다 큰 레이어를 새로 래스터해 프레임이 밀립니다.
- 프레임이 계속 34fps 아래로 떨어지면 렌더링 해상도를 단계적으로 낮춥니다(첫 프레임들은 빼고 잼). 캔버스는 `100lvh`로 고정해 모바일 주소창이 움직여도 그리기 버퍼를 다시 만들지 않습니다.
- 장면을 닫으면 모든 자원을 놓아 주고 WebGL 컨텍스트도 바로 놓습니다(`forceContextLoss`). 장면을 띄우기 전에 화면을 떠나면 받던 모델도 멈춥니다.

동작 줄이기 설정에서는 장면을 띄우지 않고, WebGL을 쓸 수 없으면 CSS 배경과 글자만 보여 줍니다.

## 디자인 기준

- 인트로는 프라이머리 `#8B0000`을 중심으로 한 적색 계열입니다. 메인은 흑백만 씁니다.
- 3D 모델은 모두 CC BY 4.0입니다: “Phoenix” by NORBERTO-3D, “Feathers” by victorberdugo1, “Phoenix Logo” by Suraj-456tyu. 작품명·작가·라이선스와 변경 사항은 README의 '출처' 표에 두고, 인트로 끝과 메인 바닥글에는 그 표로 가는 링크만 둡니다. 라이선스 원문은 `public/models/*-license.txt`에 둡니다. 표기를 지우지 않습니다.
- 참고 사이트의 모델, 텍스처, 로고, 사진, 유료 글꼴은 저작물이므로 가져오지 않습니다. 글꼴은 OFL 라이선스의 Inter, JetBrains Mono, Cormorant를 씁니다.
- 한글은 첫 화면 성능을 위해 운영체제 글꼴을 씁니다.

## TypeScript 버전

`typescript-eslint`가 TypeScript 7을 지원하지 않아 6으로 고정했습니다.

## E2E

WebGL 장면을 GPU 없이 그리므로 Playwright는 작업자 1개로 돌립니다. 데스크톱에서는 인트로와 메인을 두 번 오간 뒤 살아 있는 WebGL 컨텍스트가 0개이고 그리기 루프(rAF)도 멈췄는지 확인합니다. 첫 왕복에서는 매 프레임 메인 스레드를 40ms씩 붙잡아 해상도 자동 조절이 일어난 뒤에 떠납니다(조절하며 루프가 둘로 갈라지면 하나가 남던 문제의 회귀 검사). 이 검사만 화면을 800×500으로 줄여 GPU 없는 CI에서도 15초 안팎에 끝납니다.

## 디자인 시스템(Storybook) 배포

`pnpm build`는 Storybook을 먼저 `public/storybook`에 빌드한 뒤 사이트를 빌드합니다. 그래서 사이트와 같은 주소의 `/storybook`에 함께 배포되고, 메인 화면 바닥글의 **디자인 시스템(Storybook)** 링크로 들어갑니다.

- `/storybook`은 정적 파일 폴더라 `/storybook/index.html`로 보냅니다(`next.config.ts`의 `redirects`).
- `pnpm build-storybook`(앱 빌드가 먼저 부르는 스크립트)으로 빌드할 때는 `public`을 복사하지 않습니다. 같은 주소에서 열리므로 파일은 사이트의 것을 씁니다.
- 개발 서버(`pnpm dev`)에서는 링크가 Storybook 개발 서버(`http://localhost:6006`)로 갑니다.

## 품질 예산

- **번들 크기:** `pnpm size`가 전체 JS 400 kB, CSS 8 kB(gzip)를 넘으면 실패합니다. 이 가운데 약 180 kB는 인트로에서만 늦게 받는 three.js 장면 청크입니다. 기준은 `.size-limit.json`에 있습니다.
- **Lighthouse:** `pnpm lhci`가 메인이 데스크톱 기준 성능 90·접근성 100·권장 사항 95·SEO 90점, LCP 2.5초·TBT 200ms·CLS 0.1 이하인지 3번씩 재서 확인합니다. 기준은 `lighthouserc.json`에 있습니다.
- **README 스크린샷:** 인트로 화면 캡처(`docs/images/intro-*.jpg`)는 프로덕션 서버를 띄운 뒤 `pnpm screenshots [주소]`(기본 `http://localhost:3210`)로 다시 만듭니다. 로고나 인트로 화면을 바꾸면 함께 찍습니다.
- **접근성 린트:** `eslint-config-next`는 jsx-a11y 규칙을 몇 개만 켭니다. 플러그인은 이미 등록되어 있어 `eslint.config`에서 recommended 규칙만 더해 모두 켭니다.

인트로(`/`)는 three.js WebGL 장면이라 GPU가 없는 CI에서는 소프트웨어로 그려 TBT가 40초까지 나옵니다(GPU가 있는 기기에서는 20ms 안팎). 그래서 인트로는 접근성·권장 사항·SEO·CLS만 검사하고, 성능 점수와 LCP·TBT는 메인(`/main`)에서 검사합니다.

두 검사 모두 프로덕션 빌드가 먼저 있어야 하며, CI는 빌드 뒤에 돌립니다.

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

## PR 미리보기 배포

Vercel의 하루 배포 한도를 아끼려고 PR 미리보기 배포를 껐습니다(`vercel.json`의 `git.deploymentEnabled`). `main`에 머지할 때만 운영으로 배포하고, PR에서는 CI 검사만 돕니다. 미리보기가 꼭 필요하면 그 브랜치를 `deploymentEnabled`에 잠시 넣습니다.
