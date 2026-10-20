const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** تبدیل ارقام فارسی/عربی به انگلیسی */
export function toEnDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (d) => {
    const fa = FA_DIGITS.indexOf(d);
    if (fa >= 0) return String(fa);
    return String(AR_DIGITS.indexOf(d));
  });
}

/** ورودی کاربر → عدد صحیح تومانی؛ اگه معتبر نبود null */
export function parseAmount(input: string): number | null {
  const digits = toEnDigits(input).replace(/\D/g, "");
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

/** نمایش عدد با ارقام فارسی و جداکننده هزارگان */
export function formatMoney(n: number): string {
  return n.toLocaleString("fa-IR");
}

/** تاریخ شمسی */
export function formatJalaliDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}
