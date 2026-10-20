import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 모드의 StrictMode는 컴포넌트를 한 번 내렸다 다시 올린다. R3F 9.4의 Canvas는 내릴 때 500ms 뒤 렌더러를 정리하며 컨텍스트를
  // 일부러 잃게 하는데(forceContextLoss), 다시 올린 Canvas가 같은 렌더러를 그대로 써서 그 정리에 컨텍스트가 끊기고 여정 장면이 실패했다
  // (스펙 10절, 2-4b). 프로덕션에는 StrictMode의 두 번 마운트가 없어 동작이 같다.
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
    ],
  },
};

export default nextConfig;
