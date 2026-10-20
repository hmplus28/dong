import type { Expense, Member } from "./types";
import {
  MAX_AMOUNT,
  MAX_NAME_LENGTH,
  MAX_TITLE_LENGTH,
} from "./types";
import { normalizeName } from "./utils";

export const BACKUP_APP = "dang-hesab";
export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  members: Member[];
  expenses: Expense[];
}

export function buildBackup(
  members: Member[],
  expenses: Expense[]
): BackupFile {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    members,
    expenses,
  };
}

type Valid<T> = { ok: true; data: T } | { ok: false; error: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** اعتبارسنجی سخت‌گیرانه فایل پشتیبان قبل از بازیابی */
export function validateBackup(input: unknown): Valid<BackupFile> {
  if (!isObject(input)) return { ok: false, error: "فایل پشتیبان معتبر نیست." };
  if (input.app !== BACKUP_APP || input.version !== BACKUP_VERSION) {
    return {
      ok: false,
      error: "این فایل مال دنگ‌حساب نیست یا نسخه‌ش سازگار نیست.",
    };
  }
  if (!Array.isArray(input.members) || !Array.isArray(input.expenses)) {
    return { ok: false, error: "ساختار فایل پشتیبان معتبر نیست." };
  }
  if (input.members.length === 0 && input.expenses.length > 0) {
    return { ok: false, error: "فایل پشتیبان ناقصه (عضوی توش نیست)." };
  }
  if (input.members.length > 200 || input.expenses.length > 5000) {
    return { ok: false, error: "حجم داده‌های فایل بیش از حد مجازه." };
  }

  const members: Member[] = [];
  const memberIds = new Set<string>();
  const memberNames = new Set<string>();
  for (const raw of input.members) {
    if (!isObject(raw))
      return { ok: false, error: "اطلاعات اعضا توی فایل خرابه." };
    const { id, name, createdAt } = raw;
    if (typeof id !== "string" || id.length === 0 || memberIds.has(id)) {
      return { ok: false, error: "شناسه اعضا توی فایل نامعتبر یا تکراریه." };
    }
    memberIds.add(id);
    if (typeof name !== "string")
      return { ok: false, error: "اسم یکی از اعضا توی فایل معتبر نیست." };
    const norm = normalizeName(name);
    if (!norm || norm.length > MAX_NAME_LENGTH || norm !== name) {
      return { ok: false, error: "اسم یکی از اعضا توی فایل معتبر نیست." };
    }
    if (memberNames.has(norm))
      return { ok: false, error: "اسم اعضا توی فایل تکراریه." };
    memberNames.add(norm);
    members.push({
      id,
      name,
      createdAt:
        typeof createdAt === "string" ? createdAt : new Date(0).toISOString(),
    });
  }

  const expenses: Expense[] = [];
  const expenseIds = new Set<string>();
  for (const raw of input.expenses) {
    if (!isObject(raw))
      return { ok: false, error: "اطلاعات هزینه‌ها توی فایل خرابه." };
    const { id, title, amount, splitType, payerId, participants, createdAt } =
      raw;
    if (typeof id !== "string" || id.length === 0 || expenseIds.has(id)) {
      return { ok: false, error: "شناسه هزینه‌ها توی فایل نامعتبر یا تکراریه." };
    }
    expenseIds.add(id);
    const t = typeof title === "string" ? title.trim() : "";
    if (!t || t.length > MAX_TITLE_LENGTH) {
      return { ok: false, error: "عنوان یکی از هزینه‌ها توی فایل معتبر نیست." };
    }
    if (
      typeof amount !== "number" ||
      !Number.isInteger(amount) ||
      amount <= 0 ||
      amount > MAX_AMOUNT
    ) {
      return { ok: false, error: "مبلغ یکی از هزینه‌ها توی فایل معتبر نیست." };
    }
    if (splitType !== "equal" && splitType !== "custom") {
      return {
        ok: false,
        error: "نوع تقسیم یکی از هزینه‌ها توی فایل معتبر نیست.",
      };
    }
    if (typeof payerId !== "string" || !memberIds.has(payerId)) {
      return {
        ok: false,
        error: "پرداخت‌کننده یکی از هزینه‌ها توی فایل معتبر نیست.",
      };
    }
    if (!Array.isArray(participants) || participants.length === 0) {
      return {
        ok: false,
        error: "سهیم‌های یکی از هزینه‌ها توی فایل معتبر نیست.",
      };
    }
    const parts: Expense["participants"] = [];
    const seen = new Set<string>();
    let sum = 0;
    for (const p of participants) {
      if (!isObject(p)) return { ok: false, error: "سهم‌ها توی فایل خرابه." };
      const { memberId, shareAmount } = p;
      if (
        typeof memberId !== "string" ||
        !memberIds.has(memberId) ||
        seen.has(memberId)
      ) {
        return {
          ok: false,
          error: "سهیم‌های یکی از هزینه‌ها توی فایل معتبر نیست.",
        };
      }
      if (
        typeof shareAmount !== "number" ||
        !Number.isInteger(shareAmount) ||
        shareAmount < 0
      ) {
        return {
          ok: false,
          error: "مبلغ سهم یکی از نفرات توی فایل معتبر نیست.",
        };
      }
      seen.add(memberId);
      sum += shareAmount;
      parts.push({ memberId, shareAmount });
    }
    if (sum !== amount) {
      return {
        ok: false,
        error: "جمع سهم‌ها یکی از هزینه‌ها با مبلغش برابر نیست.",
      };
    }
    expenses.push({
      id,
      title: t,
      amount,
      splitType,
      payerId,
      participants: parts,
      createdAt:
        typeof createdAt === "string" ? createdAt : new Date(0).toISOString(),
    });
  }

  return {
    ok: true,
    data: {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt:
        typeof input.exportedAt === "string"
          ? input.exportedAt
          : new Date().toISOString(),
      members,
      expenses,
    },
  };
}

/** دانلود فایل پشتیبان JSON */
export function downloadBackup(
  members: Member[],
  expenses: Expense[]
): void {
  const data = JSON.stringify(buildBackup(members, expenses), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `dang-hesab-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
