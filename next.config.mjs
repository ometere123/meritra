/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@stripe/stripe-js": false,
      "@solana/wallet-adapter-react": false,
      "@farcaster/miniapp-sdk": false,
    };

    return config;
  },
};
export default nextConfig;
