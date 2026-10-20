#!/usr/bin/env node
/**
 * دنگ‌حساب — آماده‌سازی دیتابیس قبل از بیلد
 *
 * - اگر DATABASE_URL با postgres:// یا postgresql:// شروع بشه، provider
 *   اسکیمای Prisma به‌طور خودکار به postgresql تغییر می‌کنه (مناسب دیتابیس
 *   ابری مثل Neon).
 * - اگر تنظیم نشده باشه، بیلد «نه» شکست می‌خوره: پیش‌فرض SQLite لوکال
 *   استفاده می‌شه. روی نتلیفای هم ذخیره‌سازی داده‌ها به‌صورت خودکار از
 *   Netlify Blobs (سرور نتلیفای) انجام می‌شه، پس هیچ تنظیم اجباری لازم نیست.
 * - کلاینت Prisma تولید و اسکیما روی دیتابیس اعمال می‌شه (db push).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const schemaPath = path.join(root, "prisma", "schema.prisma");
const defaultSqliteUrl = "file:" + path.join(root, "db", "custom.db");

const hasUrl = Boolean(process.env.DATABASE_URL);
if (!hasUrl) {
  // بیلد نباید به‌خاطر نبودِ DATABASE_URL بمیره؛ روی نتلیفای زمان اجرا از
  // Netlify Blobs استفاده می‌شه و اینجا فقط برای تولید کلاینت Prismaه.
  process.env.DATABASE_URL = defaultSqliteUrl;
  console.log("⚠ DATABASE_URL تنظیم نشده؛ برای بیلد از SQLite لوکال استفاده می‌شه.");
  console.log("  • روی نتلیفای: ذخیره‌سازی داده‌ها خودکار از طریق Netlify Blobs انجام می‌شه (بدون تنظیم).");
  console.log("  • اگه دیتابیس اختصاصی PostgreSQL می‌خوای (مثل neon.tech)،");
  console.log("    متغیر DATABASE_URL رو توی Site settings → Environment variables تنظیم کن.");
}

const url = process.env.DATABASE_URL ?? "";

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
