import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
