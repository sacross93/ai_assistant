/** @type {import('next').NextConfig} */
const nextConfig = {
    // Disable strict mode for now to avoid double rendering in dev
    reactStrictMode: false,
    serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
