import { randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";

import type { Expense, Member } from "./types";
import {
  StoreError,
  extractMemberName,
  isStoreObject,
  sortExpenses,
  sortMembers,
  validateExpenseInput,
  validateReplaceBody,
  type DangData,
  type DataStore,
} from "./store-core";

/**
 * پیاده‌سازی Netlify Blobs — ذخیره‌سازی ماندگار و خودکار روی سرورهای
 * نتلیفای، بدون هیچ تنظیم اضافه‌ای. کل داده‌ی گروه (اعضا + هزینه‌ها) به‌صورت
 * یک سند JSON توی استور site-wide نگه داشته می‌شه؛ حجم داده‌ی این اپ خیلی
 * کمتر از حدیه که این مدل براش مشکل بسازه.
 */

const STORE_NAME = "dang-hesab";
const DATA_KEY = "group-data";

/** خطای واضح فارسی وقتی Blobs نتلیفای برامون تنظیم نشده باشه */
function blobsError(err: unknown): never {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : "";
  if (/Blobs|siteID|token/i.test(msg)) {
    throw new StoreError(
      "ذخیره‌سازی نتلیفای (Blobs) برای این سایت فعال نیست. یا از پنل نتلیفای فعالش کن، یا متغیر DATABASE_URL رو با یه PostgreSQL ابری (مثل neon.tech) تنظیم کن.",
      503
    );
  }
  throw err as unknown;
}

async function readData(): Promise<DangData> {
  try {
    const store = getStore(STORE_NAME);
    const raw: unknown = await store.get(DATA_KEY, { type: "json" });
    if (raw === null || raw === undefined) {
      return { members: [], expenses: [] };
    }
    if (
      !isStoreObject(raw) ||
      !Array.isArray(raw.members) ||
      !Array.isArray(raw.expenses)
    ) {
      throw new StoreError(
        "داده‌های ذخیره‌شده روی سرور ناسالمه؛ از تب اعضا با فایل پشتیبان بازیابی کن.",
        500
      );
    }
    return raw as unknown as DangData;
  } catch (err) {
    if (err instanceof StoreError) throw err;
    blobsError(err);
  }
}

async function writeData(data: DangData): Promise<void> {
  try {
    const store = getStore(STORE_NAME);
    await store.setJSON(DATA_KEY, data);
  } catch (err) {
    blobsError(err);
  }
}

export function createBlobsStore(): DataStore {
  return {
    async listAll() {
      const data = await readData();
      return {
        members: sortMembers(data.members),
        expenses: sortExpenses(data.expenses),
      };
    },

    async addMember(body) {
      const name = extractMemberName(body);
      const data = await readData();
      if (data.members.some((m) => m.name === name)) {
        throw new StoreError(`«${name}» قبلاً عضو شده.`, 409);
      }
      const member: Member = {
        id: randomUUID(),
        name,
        createdAt: new Date().toISOString(),
      };
      data.members.push(member);
      await writeData(data);
      return member;
    },

    async removeMember(id) {
      const data = await readData();
      const member = data.members.find((m) => m.id === id);
      if (!member) throw new StoreError("عضو پیدا نشد.", 404);

      const used = data.expenses.some(
        (e) =>
          e.payerId === id || e.participants.some((p) => p.memberId === id)
      );
      if (used) {
        throw new StoreError(
          "این عضو توی هزینه‌ها استفاده شده؛ اول هزینه‌های مربوط رو حذف کن.",
          409
        );
      }

      data.members = data.members.filter((m) => m.id !== id);
      await writeData(data);
    },

    async addExpense(body) {
      const data = await readData();
      const input = validateExpenseInput(body, sortMembers(data.members));
      const expense: Expense = {
        id: randomUUID(),
        title: input.title,
        amount: input.amount,
        splitType: input.splitType,
        payerId: input.payerId,
        participants: input.participants,
        createdAt: new Date().toISOString(),
      };
      data.expenses.push(expense);
      await writeData(data);
      return expense;
    },

    async removeExpense(id) {
      const data = await readData();
      const expense = data.expenses.find((e) => e.id === id);
      if (!expense) throw new StoreError("هزینه پیدا نشد.", 404);

      data.expenses = data.expenses.filter((e) => e.id !== id);
      await writeData(data);
    },

    async replaceAll(body) {
      const data = validateReplaceBody(body);
      await writeData(data);
    },

    async resetAll() {
      await writeData({ members: [], expenses: [] });
    },
  };
}
