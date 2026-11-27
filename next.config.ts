import type { NextConfig } from "next";
import { babelOptions } from "./stylex.config.mjs";

const isDev = process.env.NODE_ENV === "development";

/** Sentry로 오류를 보내는 주소(DSN이 있을 때만). DSN의 호스트가 수집 서버입니다. */
function sentryOrigin(dsn: string | undefined) {
  if (!dsn) return null;
  try {
    return new URL(dsn).origin;
  } catch {
    return null;
  }
}
const sentry = sentryOrigin(process.env.NEXT_PUBLIC_SENTRY_DSN);

/**
 * 보안 헤더
 * - CSP: nonce를 쓰면 모든 페이지를 요청마다 그려야 하므로, 정적 페이지를 지키는 nonce 없는 방식을 씁니다.
 *   Next.js의 인라인 스크립트·스타일 때문에 'unsafe-inline'이 필요하고, 다른 출처의 스크립트는 막습니다.
 * - 'wasm-unsafe-eval': 불사조 모델의 meshopt 압축을 푸는 디코더가 WebAssembly입니다(eval은 열지 않음).
 * - blob:: glTF 안의 텍스처를 blob 주소로 만들어 읽습니다(크롬은 fetch, 사파리는 이미지).
 * - frame-ancestors 'none', X-Frame-Options: 다른 사이트가 이 사이트를 프레임으로 끼워 넣지 못하게 합니다.
 * - 개발 서버에서만 'unsafe-eval'(React 디버깅)과 ws:(바뀐 코드 바로 반영)를 엽니다.
 * - upgrade-insecure-requests는 Vercel 배포에서만 씁니다(로컬 http 서버의 요청을 https로 바꾸지 않도록).
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  ["connect-src 'self' blob:", sentry, isDev ? "ws:" : null].filter(Boolean).join(" "),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(process.env.VERCEL ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

/** Storybook은 미리보기를 같은 출처의 iframe으로 띄우고, 내장 글꼴을 data: 주소로 불러옵니다. */
const storybookHeaders = securityHeaders.map((header) => {
  if (header.key === "X-Frame-Options") return { ...header, value: "SAMEORIGIN" };
  if (header.key === "Content-Security-Policy")
    return {
      ...header,
      value: header.value
        .replace("frame-ancestors 'none'", "frame-ancestors 'self'")
        .replace("font-src 'self'", "font-src 'self' data:"),
    };
  return header;
});

type TurbopackRule = NonNullable<NonNullable<NextConfig["turbopack"]>["rules"]>[string];

/** StyleX를 가져오는 저장소 파일(node_modules 제외)만 Babel(StyleX 플러그인)에 넘깁니다. */
const stylexRule: TurbopackRule = {
  condition: { all: [{ not: "foreign" }, { content: /@stylexjs\/stylex/ }] },
  loaders: [{ loader: "babel-loader", options: babelOptions }],
};

const nextConfig: NextConfig = {
  // next dev가 AGENTS.md에 영어 에이전트 안내 블록을 넣지 않게 합니다. 같은 내용은 AGENTS.md에 한국어로 적었습니다.
  agentRules: false,
  reactStrictMode: true,
  /*
   * StyleX: stylex.create·props 호출을 빌드할 때 클래스 이름으로 바꿉니다(CSS는 postcss.config.mjs가 뽑음).
   * Babel은 StyleX를 가져오는 저장소 파일에만 걸고, 나머지 변환(JSX·TS·하위 문법)과 압축은 그대로 SWC가 합니다.
   */
  // Babel 설정 파일 대신 위 규칙으로 babel-loader를 직접 걸므로 Next의 자동 Babel 로더는 끕니다(설정 파일이 없어 하는 일도 없음).
  experimental: { turbopackUseBuiltinBabel: false },
  turbopack: {
    rules: {
      "*.tsx": stylexRule,
      "*.ts": stylexRule,
    },
  },
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/((?!storybook/).*)", headers: securityHeaders },
      { source: "/storybook/:path*", headers: storybookHeaders },
    ];
  },
  // 빌드할 때 만든 Storybook(public/storybook)은 정적 파일이라 폴더 주소로는 열리지 않아 index.html로 보냅니다.
  async redirects() {
    return [
      {
        source: "/storybook",
        destination: "/storybook/index.html",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
