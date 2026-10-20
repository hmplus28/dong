#!/usr/bin/env node
/**
 * دنگ‌حساب — آماده‌سازی دیتابیس قبل از بیلد
 *
 * - اگر DATABASE_URL با postgres:// یا postgresql:// شروع بشه، provider
 *   اسکیمای Prisma به‌طور خودکار به postgresql تغییر می‌کنه (مناسب دیتابیس
 *   ابری مثل Neon برای دیپلوی روی نتلیفای).
 * - اگر file:// باشه، همون SQLite لوکال می‌مونه.
 * - کلاینت Prisma تولید و اسکیما روی دیتابیس اعمال می‌شه (db push).
 * - اگر DATABASE_URL اصلاً تنظیم نشده باشه، بیلد با پیام واضح شکست می‌خوره
 *   تا اشتباهی نسازم که داده‌ها جایی ذخیره نشن.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const schemaPath = path.join(root, "prisma", "schema.prisma");

const url = process.env.DATABASE_URL ?? "";

if (!url) {
  console.error("✖ متغیر DATABASE_URL تنظیم نشده!");
  console.error("  • روی نتلیفای: Site settings → Environment variables");
  console.error("    متغیر DATABASE_URL رو با رشته‌ی اتصال PostgreSQL (مثل neon.tech) تنظیم کن.");
  console.error("    نمونه: postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require");
  console.error("  • لوکال: از فایل .env.example یه .env بساز.");
  process.exit(1);
}

const wantProvider =
  url.startsWith("postgres://") || url.startsWith("postgresql://")
    ? "postgresql"
    : "sqlite";

let schema = readFileSync(schemaPath, "utf8");
const blockRe = /(datasource\s+\w+\s*\{[\s\S]*?provider\s*=\s*)"[a-z]+"/;
const match = blockRe.exec(schema);
if (!match) {
  console.error("✖ بلوک datasource توی prisma/schema.prisma پیدا نشد.");
  process.exit(1);
}
const currentProvider = /provider\s*=\s*"([a-z]+)"/.exec(match[0])?.[1];

if (currentProvider !== wantProvider) {
  schema = schema.replace(blockRe, `$1"${wantProvider}"`);
  writeFileSync(schemaPath, schema);
  console.log(`▸ Prisma provider: ${currentProvider} → ${wantProvider}`);
} else {
  console.log(`▸ Prisma provider: ${wantProvider}`);
}

if (wantProvider === "sqlite") {
  mkdirSync(path.join(root, "db"), { recursive: true });
  console.log("⚠ توجه: SQLite فقط برای اجرای لوکاله؛ روی سرورهای بدون دیسک");
  console.log("  پایدار (مثل نتلیفای) داده‌ها بعد از ری‌استارت پاک می‌شن.");
  console.log("  برای دیپلوی واقعی، یه PostgreSQL ابری (مثل neon.tech) وصل کن.");
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: "inherit", cwd: root, shell: false });
  if (res.status !== 0) {
    console.error(`✖ دستور ناموفق بود: ${cmd} ${args.join(" ")}`);
    process.exit(res.status ?? 1);
  }
}

console.log("▸ prisma generate …");
run("npx", ["prisma", "generate"]);

console.log("▸ prisma db push (همگام‌سازی جداول) …");
run("npx", ["prisma", "db", "push", "--skip-generate"]);

console.log("✓ دیتابیس آماده‌ست.");
