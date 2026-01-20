/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ['better-sqlite3'],

  // ✅ dev에서 jchai.co.kr 같은 외부 도메인으로 접속할 때 허용
  allowedDevOrigins: [
    'https://jchai.co.kr',
    'http://jchai.co.kr',
  ],
  // Turbopack 사용 시 명시적 설정이 없으면 에러가 발생하는 경우 방지
  turbopack: {},

  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          ...(Array.isArray(config.watchOptions?.ignored)
            ? config.watchOptions.ignored
            : config.watchOptions?.ignored
              ? [config.watchOptions.ignored]
              : []),
          '**/database.sqlite',
          '**/database.sqlite-journal',
          '**/temp_data/**',
        ],
      };
    }
    return config;
  },
};

export default nextConfig;

