# project zero

[![CI](https://github.com/ryushin01/Genesis/actions/workflows/ci.yml/badge.svg)](https://github.com/ryushin01/Genesis/actions/workflows/ci.yml)
![version](https://img.shields.io/badge/version-0.2.0-8B0000)

다양한 신화관이 얽히고 우주적 규모로 확대되어 SF 전쟁까지 이어지는 대서사시, 소설 **프로젝트 제로**의 홍보 홈페이지입니다.

**[사이트 바로 보기](https://zero.ryushin0.co.kr/)**

> **프로젝트 상태:** 개발 중입니다. 작품의 세계관·인물 자료가 정리되기 전이라 해당 구역은 "기록 준비 중"으로 표시하고, 인트로 문구는 작품 요약에서 뽑은 초안입니다.

## 화면

| 인트로: 첫 화면 | 인트로: 신화 |
|---|---|
| ![붉은 배경에서 날개를 펼친 불사조의 뒷모습 위로 project zero 제목이 놓인 인트로 첫 화면](docs/images/intro-hero.jpg) | ![거대한 태양을 향해 날아가는 적색 불사조와 안내 문구](docs/images/intro-myth.jpg) |

| 인트로: 전쟁 | 인트로: 제로 |
|---|---|
| ![행성과 함대를 배경으로 진홍색 불길에 휩싸인 불사조](docs/images/intro-war.jpg) | ![불길에 둘러싸인 깃털 고리 안에 놓인 메인으로 들어가기 버튼](docs/images/intro-zero.jpg) |

| 메인 | 세 개의 흐름 |
|---|---|
| ![흰 바탕에 넓게 벌어진 검은 소문자로 project zero를 표시한 메인 첫 화면](docs/images/main-hero.jpg) | ![검은 바탕의 흰 카드에 우주를 뜻하는 궤도 선화를 넣은 구조 화면](docs/images/main-structure.jpg) |

## 주요 기능

| 화면 | 내용 |
|---|---|
| 인트로 `/` | 스크롤에 따라 태양을 향해 날아가는 불사조 → 우주 → 전쟁 → 제로 고리로 이어지는 적색 WebGL 장면. 맨 아래에서 메인으로 이동 |
| 메인 `/main` | 흑백 편집 디자인의 작품 소개: 서사, 세 개의 흐름, 기록 보관소, 전체 화면 메뉴 |
| 접근성 | 동작 줄이기 대응, 배경 애니메이션 정지, 키보드 조작, 본문 바로가기, 저사양 기기 해상도 자동 조절 |

불사조는 [cadnav.com](http://www.cadnav.com)의 3D 모델을 렌더링한 날갯짓 이미지를 쓰고, 불길과 빛, 배경은 셰이더로 그립니다.

## 기술 스택

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![three.js](https://img.shields.io/badge/three.js-0.187-000000?logo=threedotjs)

| 구분 | 사용 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router), React 19, TypeScript 6 |
| 그래픽 | three.js, GLSL 셰이더 |
| 스타일 | CSS Modules, CSS 스크롤 기반 애니메이션 |
| 아키텍처 | Feature-Sliced Design, Steiger |
| 품질 | Vitest, Testing Library, Storybook, Playwright, axe |

## 시작하기

```bash
pnpm install
pnpm dev
```

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버 실행 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm lint` · `pnpm lint:fsd` | ESLint · FSD 구조 검사 |
| `pnpm typecheck` | 타입 검사 |
| `pnpm test` | 단위·컴포넌트 테스트 |
| `pnpm e2e` | 프로덕션 빌드 E2E 테스트 |
| `pnpm storybook` | Storybook 실행 |

## 프로젝트 구조

```text
src/
├── app/            # Next 라우트 (재내보내기만)
├── _app/           # 루트 레이아웃, 전역 스타일
├── _pages/
│   ├── intro/      # WebGL 인트로 (model: 문구·타임라인, lib: 장면·셰이더)
│   └── main/       # 흑백 메인 페이지
└── shared/lib/     # 공통 훅
public/art/         # 불사조 날갯짓 렌더링 이미지
```

## 문서

| 문서 | 내용 |
|---|---|
| [개발 가이드](docs/development.md) | 문구 교체, 인트로 장면 조정, 디자인 기준 |
| [CHANGELOG](CHANGELOG.md) | 버전 기록 |
