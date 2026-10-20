import { NextResponse } from "next/server";

import { StoreError, type DataStore } from "./store-core";
import { createPrismaStore } from "./store-prisma";
import { createBlobsStore } from "./store-blobs";

/**
 * هاب سمت سرور دنگ‌حساب:
 *  - getDataStore: انتخاب خودکار بک‌اند ذخیره‌سازی بر اساس محیط اجرا
 *  - storeErrorResponse: تبدیل خطاها به پاسخ JSON با پیام فارسی
 *
 * اولویت انتخاب بک‌اند:
 *  1. DATABASE_URL تنظیم شده → Prisma (PostgreSQL مثل neon.tech، یا SQLite)
 *  2. اجرا روی نتلیفای (نشانه‌های محیط نتلیفای موجود) → Netlify Blobs
 *     (ذخیره‌سازی ماندگار سرور، بدون هیچ تنظیمی)
 *  3. حالت پیش‌فرض لوکال → Prisma با SQLite
 */

let prismaStorePromise: Promise<DataStore> | null = null;
let resolvedKind: "prisma" | "blobs" | null = null;

function detectKind(): "prisma" | "blobs" {
  if (process.env.DATABASE_URL) return "prisma";
  // نتلیفای موقع اجرای توابع، متغیرهای محیطی خودش (از جمله زمینه‌ی Blobs)
  // رو تزریق می‌کنه؛ با دیدن هر کدوم، مسیر Blobs رو انتخاب می‌کنیم.
  if (
    process.env.NETLIFY_BLOBS_CONTEXT ||
    process.env.NETLIFY === "true" ||
    process.env.NETLIFY === "1"
  ) {
    return "blobs";
  }
  return "prisma";
}

export async function getDataStore(): Promise<DataStore> {
  const kind = (resolvedKind ??= detectKind());
  if (kind === "blobs") return createBlobsStore();
  return (prismaStorePromise ??= createPrismaStore());
}

/** تبدیل خطای استور (یا خطای ناشناخته) به پاسخ استاندارد با پیام فارسی */
export function storeErrorResponse(err: unknown): NextResponse {
  if (err instanceof StoreError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[dang] خطای سرور:", err);
  return NextResponse.json(
    {
      error:
        "یک مشکلی توی سرور پیش اومد؛ چند لحظه بعد دوباره امتحان کن.",
    },
    { status: 500 }
  );
}
