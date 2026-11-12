# 개발 가이드

## 작품 내용 바꾸기

| 내용 | 파일 |
|---|---|
| 인트로 문구, 구간 길이 | `src/_pages/intro/model/chapters.ts` |
| 인트로 첫 화면과 마지막 문구 | `src/_pages/intro/ui/IntroExperience.tsx` |
| 메인의 흐름, 기록 보관소 항목 | `src/_pages/main/ui/MainPage.tsx` |

인트로 문구와 메인 소개는 작품 요약에서만 뽑은 초안입니다. 소설 자료를 받으면 그 내용으로 바꿉니다.

## 인트로 장면

- `model/timeline.ts`: 스크롤 진행도별 3D 카메라(불사조를 도는 각도·높이·거리, 바라보는 점)와 연출 값. 문구 구간을 크게 바꾸면 함께 맞춥니다.
- `public/models/phoenix.glb`: 불사조 모델. 원본에서 목의 오각별 장식(`Plane001`)을 빼고 양자화·meshopt로 압축했습니다(약 2.7MB). 날갯짓은 모델에 든 애니메이션을 그대로 재생합니다. 라이선스는 같은 폴더의 `phoenix-license.txt`입니다.
- `public/models/feathers.glb`: 불사조가 태양에 닿아 터진 뒤 내려오는 깃털 2장(“Feathers” by victorberdugo1, CC BY 4.0). `extractFeather`가 부품을 합쳐 면이 화면을 보게 돌리고 길이를 1로 맞춘 뒤 인스턴스로 여러 장 그립니다.
- `public/models/phoenix-logo.glb`: 내려오던 깃털이 모인 자리에 나타나는 로고(“Phoenix Logo” by Suraj-456tyu, CC BY 4.0). 색은 #8B0000 계열로 옮깁니다.
- `lib/shaders.ts`: 불사조 재질에 끼워 넣는 조각(모든 색을 #8B0000 한 색조로, 불길, 역광 테두리와 대기·입자감으로 배경에 녹이기, 태양 속 소멸, 윤곽 패스), 깃털과 초신성, 배경(태양·우주·포화·불길 줄기), 함대, 불티의 GLSL.
- `lib/createPhoenixScene.ts`: 렌더링 순서. 불사조 윤곽을 저해상도로 먼저 그린 뒤 배경 셰이더가 빛과 불길로 씁니다.

프레임이 계속 34fps 아래로 떨어지면 렌더링 해상도를 단계적으로 낮춥니다. 동작 줄이기 설정에서는 장면을 띄우지 않고, WebGL을 쓸 수 없으면 CSS 배경과 글자만 보여 줍니다.

## 디자인 기준

- 인트로는 프라이머리 `#8B0000`을 중심으로 한 적색 계열입니다. 메인은 흑백만 씁니다.
- 3D 모델은 모두 CC BY 4.0입니다: “Phoenix” by NORBERTO-3D, “Feathers” by victorberdugo1, “Phoenix Logo” by Suraj-456tyu. 인트로 끝과 메인 하단, README에 작품명·작가·라이선스와 변경 사항을 표기하고, 라이선스 원문은 `public/models/*-license.txt`에 둡니다. 표기를 지우지 않습니다.
- 참고 사이트의 모델, 텍스처, 로고, 사진, 유료 글꼴은 저작물이므로 가져오지 않습니다. 글꼴은 OFL 라이선스의 Inter, JetBrains Mono, Cormorant를 씁니다.
- 한글은 첫 화면 성능을 위해 운영체제 글꼴을 씁니다.

## TypeScript 버전

`typescript-eslint`가 TypeScript 7을 지원하지 않아 6으로 고정했습니다.

## E2E

WebGL 장면을 GPU 없이 그리므로 Playwright는 작업자 1개로 돌립니다.

## 디자인 시스템(Storybook) 배포

`pnpm build`는 Storybook을 먼저 `public/storybook`에 빌드한 뒤 사이트를 빌드합니다. 그래서 사이트와 같은 주소의 `/storybook`에 함께 배포되고, 메인 화면 바닥글의 **디자인 시스템(Storybook)** 링크로 들어갑니다.

- `/storybook`은 정적 파일 폴더라 `/storybook/index.html`로 보냅니다(`next.config.ts`의 `redirects`).
- `pnpm build-storybook`(앱 빌드가 먼저 부르는 스크립트)으로 빌드할 때는 `public`을 복사하지 않습니다. 같은 주소에서 열리므로 파일은 사이트의 것을 씁니다.
- 개발 서버(`pnpm dev`)에서는 링크가 Storybook 개발 서버(`http://localhost:6006`)로 갑니다.

## 품질 예산

- **번들 크기:** `pnpm size`가 전체 JS 375 kB, CSS 8 kB(gzip)를 넘으면 실패합니다. 기준은 `.size-limit.json`에 있습니다.
- **Lighthouse:** `pnpm lhci`가 메인이 데스크톱 기준 성능 90·접근성 100·권장 사항 95·SEO 90점, LCP 2.5초·TBT 200ms·CLS 0.1 이하인지 3번씩 재서 확인합니다. 기준은 `lighthouserc.json`에 있습니다.
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
