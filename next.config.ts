import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
