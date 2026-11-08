# 개발 가이드

## 작품 내용 바꾸기

| 내용 | 파일 |
|---|---|
| 인트로 문구, 구간 길이 | `src/_pages/intro/model/chapters.ts` |
| 인트로 첫 화면과 마지막 문구 | `src/_pages/intro/ui/IntroExperience.tsx` |
| 메인의 흐름, 기록 보관소 항목 | `src/_pages/main/ui/MainPage.tsx` |

인트로 문구와 메인 소개는 작품 요약에서만 뽑은 초안입니다. 소설 자료를 받으면 그 내용으로 바꿉니다.

## 인트로 장면

- `model/timeline.ts`: 스크롤 진행도별 2D 카메라(확대·이동)와 연출 값. 문구 구간을 크게 바꾸면 함께 맞춥니다.
- `public/art/phoenix-flight-1.webp`, `-2.webp`: 세 카메라 각도의 날갯짓 10프레임씩(총 30칸)을 4x4로 담은 렌더링 이미지입니다. R은 명도, B는 형상입니다. 불사조를 교체할 때는 같은 형식으로 이 파일들만 바꿉니다.
- `lib/drawPhoenixArt.ts`: 인트로 끝의 제로 고리를 캔버스에 그립니다.
- `lib/shaders.ts`: 프레임 재생과 색·불길·빛 번짐 셰이더, 배경(태양·우주·포화), 함대, 불티의 GLSL.
- `lib/createPhoenixScene.ts`: 렌더링 순서. 불사조 윤곽을 저해상도로 먼저 그린 뒤 배경 셰이더가 빛과 불길로 씁니다.

프레임이 계속 34fps 아래로 떨어지면 렌더링 해상도를 단계적으로 낮춥니다. 동작 줄이기 설정에서는 장면을 띄우지 않고, WebGL을 쓸 수 없으면 CSS 배경과 글자만 보여 줍니다.

## 디자인 기준

- 인트로는 프라이머리 `#8B0000`을 중심으로 한 적색 계열입니다. 메인은 흑백만 씁니다.
- 불사조는 cadnav.com 3D 모델을 렌더링한 이미지입니다. 약관에 따라 출처를 표기하고, 원본 `.max`와 텍스처는 저장소에 넣지 않습니다(단독 재배포 금지).
- 참고 사이트의 모델, 텍스처, 로고, 사진, 유료 글꼴은 저작물이므로 가져오지 않습니다. 글꼴은 OFL 라이선스의 Inter, JetBrains Mono, Cormorant를 씁니다.
- 한글은 첫 화면 성능을 위해 운영체제 글꼴을 씁니다.

## TypeScript 버전

`typescript-eslint`가 TypeScript 7을 지원하지 않아 6으로 고정했습니다.

## E2E

WebGL 장면을 GPU 없이 그리므로 Playwright는 작업자 1개로 돌립니다.
