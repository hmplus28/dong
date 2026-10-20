/** شناسه یکتا — اول از randomUUID مرورگر، وگرنه یه fallback مطمئن */
export function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** نرمال‌سازی اسم فارسی: یکسان‌سازی ی/ک عربی و حذف فاصله‌های اضافه */
export function normalizeName(raw: string): string {
  return raw
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .trim()
    .replace(/\s+/g, " ");
}
