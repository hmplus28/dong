import path from "node:path";
import { PrismaClient } from "@prisma/client";

// اگه DATABASE_URL تنظیم نشده باشه (مثلاً موقع بیلد نتلیفای)، یه SQLite
// پیش‌فرض با مسیر «مطلق» می‌ذاریم تا ساخت کلاینت موقع بیلد خطا نده.
// (مسیر نسبی توی پراسیما نسبت به پوشه‌ی prisma/ حل می‌شه، نه cwd — پس
// حتماً باید absolute باشه.) توی اجرای واقعی روی نتلیفای، مسیر ذخیره‌سازی
// خودکار Netlify Blobs هست و این مقدار استفاده نمی‌شه.
process.env.DATABASE_URL ??=
  "file:" + path.join(process.cwd(), "db", "custom.db");

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
