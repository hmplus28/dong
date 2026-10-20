import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // خروجی استاتیک کامل برای دپلوی روی نتلیفای (پوشه out بدون هیچ سروری)
  output: "export",
  images: { unoptimized: true },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
