import type { Expense, Member, SplitType } from "./types";
import { MAX_AMOUNT, MAX_NAME_LENGTH, MAX_TITLE_LENGTH } from "./types";
import { validateBackup } from "./backup";
import { splitEqually } from "./settlement";
import { normalizeName } from "./utils";

/**
 * لایه‌ی داده‌ی سروری دنگ‌حساب.
 *
 * دو پیاده‌سازی داره (store-prisma و store-blobs) و تابع getDataStore توی
 * server.ts بر اساس محیط اجرا یکی رو برمی‌داره:
 *  - لوکال / DATABASE_URL تنظیم‌شده → Prisma (SQLite یا PostgreSQL)
 *  - نتلیفای بدون تنظیم → Netlify Blobs (ذخیره‌سازی خودکار و ماندگار سرور)
 *
 * همه‌ی اعتبارسنجی‌ها و پیام‌های فارسی اینجا مشترکه تا هر دو بک‌اند
 * رفتال کاملاً یکسانی داشته باشن.
 */

export interface DangData {
  members: Member[];
  expenses: Expense[];
}

/** خطای دامنه با وضعیت HTTP و پیام فارسی */
export class StoreError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "StoreError";
    this.status = status;
  }
}

export interface DataStore {
  listAll(): Promise<DangData>;
  /** بدنه‌ی درخواست {name} را اعتبارسنجی می‌کنه و عضو جدید می‌سازه */
  addMember(body: unknown): Promise<Member>;
  removeMember(id: string): Promise<void>;
  /** بدنه‌ی خام درخواست هزینه را اعتبارسنجی و ثبت می‌کنه */
  addExpense(body: unknown): Promise<Expense>;
  removeExpense(id: string): Promise<void>;
  /** بازیابی کامل از فایل پشتیبان (جایگزین همه‌چیز) */
  replaceAll(body: unknown): Promise<void>;
  resetAll(): Promise<void>;
}

export function isStoreObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function fmt(n: number): string {
  try {
    return n.toLocaleString("fa-IR");
  } catch {
    return String(n);
  }
}

/** مرتب‌سازی پایدار اعضا مثل Prisma: بر اساس createdAt و بعد id */
export function sortMembers(members: Member[]): Member[] {
  return [...members].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
  );
}

/** مرتب‌سازی پایدار هزینه‌ها مثل Prisma: جدیدترین اول */
export function sortExpenses(expenses: Expense[]): Expense[] {
  return [...expenses].sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)
  );
}

/** اعتبارسنجی اسم عضو (همان قواعد قبلی API) */
export function validateMemberName(rawName: unknown): string {
  if (typeof rawName !== "string") {
    throw new StoreError("اسم عضو رو بنویس.");
  }
  const name = normalizeName(rawName);
  if (!name) throw new StoreError("اسم عضو رو بنویس.");
  if (name.length > MAX_NAME_LENGTH) {
    throw new StoreError("اسم نباید بیشتر از ۴۰ حرف باشه.");
  }
  return name;
}

/** استخراج و اعتبارسنجی فیلد name از بدنه‌ی درخواست {name} */
export function extractMemberName(body: unknown): string {
  if (!isStoreObject(body) || typeof body.name !== "string") {
    throw new StoreError("اسم عضو رو بنویس.");
  }
  return validateMemberName(body.name);
}

export interface NewExpenseInput {
  title: string;
  amount: number;
  splitType: SplitType;
  payerId: string;
  participants: { memberId: string; shareAmount: number }[];
}

/**
 * اعتبارسنجی کامل بدنه‌ی ثبت هزینه — همان قواعد قبلی API، با همین
 * پیام‌های فارسی و محاسبه‌ی سهم‌ها سمت سرور.
 */
export function validateExpenseInput(
  body: unknown,
  members: Member[]
): NewExpenseInput {
  if (!isStoreObject(body)) throw new StoreError("درخواست معتبر نیست.");

  // ── عنوان ───────────────────────────────────────────────
  if (typeof body.title !== "string") {
    throw new StoreError("عنوان هزینه رو بنویس.");
  }
  const title = body.title.trim().replace(/\s+/g, " ");
  if (!title) throw new StoreError("عنوان هزینه رو بنویس.");
  if (title.length > MAX_TITLE_LENGTH) {
    throw new StoreError("عنوان نباید بیشتر از ۸۰ حرف باشه.");
  }

  // ── مبلغ ────────────────────────────────────────────────
  const amount = body.amount;
  if (
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    throw new StoreError("مبلغ باید یه عدد صحیح مثبت به تومان باشه.");
  }
  if (amount > MAX_AMOUNT) throw new StoreError("مبلغ بیشتر از حد مجازه.");

  // ── نوع تقسیم ───────────────────────────────────────────
  const splitType = body.splitType;
  if (splitType !== "equal" && splitType !== "custom") {
    throw new StoreError("نوع تقسیم معتبر نیست.");
  }

  // ── پرداخت‌کننده ────────────────────────────────────────
  if (typeof body.payerId !== "string") {
    throw new StoreError("پرداخت‌کننده رو انتخاب کن.");
  }
  const payer = members.find((m) => m.id === body.payerId);
  if (!payer) throw new StoreError("پرداخت‌کننده رو انتخاب کن.");

  // ── سهیم‌ها ─────────────────────────────────────────────
  if (
    !Array.isArray(body.participantIds) ||
    body.participantIds.some((x) => typeof x !== "string")
  ) {
    throw new StoreError("لیست سهیم‌ها معتبر نیست.");
  }
  const ids = [...new Set(body.participantIds as string[])];
  if (ids.length === 0) {
    throw new StoreError("حداقل یک نفر باید توی این خرج سهیم باشه.");
  }
  // ترتیب پایدار: بر اساس ترتیب اعضا (ساختار فعلی گروه)
  const ordered = members
    .filter((m) => ids.includes(m.id))
    .map((m) => m.id);
  if (ordered.length !== ids.length) {
    throw new StoreError("لیست سهیم‌ها معتبر نیست.");
  }

  // ── محاسبه سهم‌ها (سمت سرور، بدون خطای اعشاری) ─────────
  let participants: { memberId: string; shareAmount: number }[];
  if (splitType === "custom") {
    const shares = body.customShares;
    if (!isStoreObject(shares)) throw new StoreError("سهم‌ها معتبر نیست.");
    participants = ordered.map((memberId) => {
      const v = shares[memberId];
      return {
        memberId,
        shareAmount: typeof v === "number" ? v : Number.NaN,
      };
    });
    if (
      participants.some(
        (p) => !Number.isInteger(p.shareAmount) || p.shareAmount < 0
      )
    ) {
      throw new StoreError(
        "سهم هر نفر باید یه عدد صحیح نامنفی به تومان باشه."
      );
    }
    const sum = participants.reduce((s, p) => s + p.shareAmount, 0);
    if (sum !== amount) {
      throw new StoreError(
        `جمع سهم‌ها (${fmt(sum)} تومان) با مبلغ هزینه (${fmt(
          amount
        )} تومان) برابر نیست.`
      );
    }
  } else {
    participants = splitEqually(amount, ordered);
  }

  // ── محک نهایی: جمع سهم‌ها باید دقیقاً برابر مبلغ باشه ───
  const total = participants.reduce((s, p) => s + p.shareAmount, 0);
  if (total !== amount) {
    throw new StoreError("جمع سهم‌ها با مبلغ هزینه برابر نیست.");
  }

  return { title, amount, splitType, payerId: payer.id, participants };
}

/** اعتبارسنجی بدنه‌ی بازیابی از فایل پشتیبان (جایگزینی کامل داده‌ها) */
export function validateReplaceBody(body: unknown): DangData {
  const res = validateBackup(body);
  if (!res.ok) throw new StoreError(res.error);

  const data = res.data;
  const validDate = (s: string) => !Number.isNaN(new Date(s).getTime());
  if (
    !data.members.every((m) => validDate(m.createdAt)) ||
    !data.expenses.every((e) => validDate(e.createdAt))
  ) {
    throw new StoreError("تاریخ‌های فایل پشتیبان معتبر نیست.");
  }
  return { members: data.members, expenses: data.expenses };
}
