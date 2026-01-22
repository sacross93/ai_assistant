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
      // 기존 ignored 설정 가져오기
      const existingIgnored = Array.isArray(config.watchOptions?.ignored)
        ? config.watchOptions.ignored
        : config.watchOptions?.ignored
          ? [config.watchOptions.ignored]
          : [];

      // 빈 문자열 필터링 후 새로운 패턴 추가
      const filteredIgnored = existingIgnored.filter(item => item && item.length > 0);

      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          ...filteredIgnored,
          '**/node_modules/**',
          '**/.next/**',
          '**/database.sqlite*',
          '**/temp_data/**',
          '**/*.log',
        ],
      };
    }
    return config;
  },
};

export default nextConfig;

