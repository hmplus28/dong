import type { NextConfig } from "next";

// معماری سروری: اپ API Routes و دیتابیس (Prisma) داره؛
// پس خروجی استاتیک (output: "export") دیگه کاربردی نداره.
// برای دپلوی روی نتلیفای، پلاگین @netlify/plugin-nextjs (فایل netlify.toml)
// SSR و API Routes رو به Netlify Functions تبدیل می‌کنه.
const nextConfig: NextConfig = {
  reactStrictMode: false,
};

export default nextConfig;
