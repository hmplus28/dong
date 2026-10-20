"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { splitEqually } from "./settlement";
import type { Expense, ExpenseInput, Member, Result } from "./types";
import {
  MAX_AMOUNT,
  MAX_NAME_LENGTH,
  MAX_TITLE_LENGTH,
} from "./types";
import { normalizeName, uid } from "./utils";

function fmt(n: number): string {
  try {
    return n.toLocaleString("fa-IR");
  } catch {
    return String(n);
  }
}

interface DangState {
  members: Member[];
  expenses: Expense[];
  addMember: (rawName: string) => Result;
  removeMember: (id: string) => Result;
  addExpense: (input: ExpenseInput) => Result;
  removeExpense: (id: string) => void;
  replaceAll: (members: Member[], expenses: Expense[]) => void;
  resetAll: () => void;
}

/**
 * کل برنامه بدون سرور کار می‌کنه؛ همه داده‌ها روی localStorage مرورگر
 * کاربر ذخیره می‌شن (کلید: dang-hesab-v1).
 * skipHydration فعال شده تا رندر سرور و کلاینت یکسان بمونه و بعد از
 * mount، دیتا از localStorage بازیابی می‌شه.
 */
export const useDangStore = create<DangState>()(
  persist(
    (set, get) => ({
      members: [],
      expenses: [],

      addMember: (rawName) => {
        const name = normalizeName(rawName);
        if (!name) return { ok: false, error: "اسم عضو رو بنویس." };
        if (name.length > MAX_NAME_LENGTH)
          return { ok: false, error: "اسم نباید بیشتر از ۴۰ حرف باشه." };
        if (get().members.some((m) => m.name === name))
          return { ok: false, error: `«${name}» قبلاً عضو شده.` };
        set((s) => ({
          members: [
            ...s.members,
            { id: uid(), name, createdAt: new Date().toISOString() },
          ],
        }));
        return { ok: true };
      },

      removeMember: (id) => {
        const used = get().expenses.some(
          (e) => e.payerId === id || e.participants.some((p) => p.memberId === id)
        );
        if (used)
          return {
            ok: false,
            error:
              "این عضو توی هزینه‌ها استفاده شده؛ اول هزینه‌های مربوط رو حذف کن.",
          };
        set((s) => ({ members: s.members.filter((m) => m.id !== id) }));
        return { ok: true };
      },

      addExpense: (input) => {
        const { members } = get();
        const title = input.title.trim().replace(/\s+/g, " ");
        if (!title) return { ok: false, error: "عنوان هزینه رو بنویس." };
        if (title.length > MAX_TITLE_LENGTH)
          return { ok: false, error: "عنوان نباید بیشتر از ۸۰ حرف باشه." };
        if (!Number.isInteger(input.amount) || input.amount <= 0)
          return {
            ok: false,
            error: "مبلغ باید یه عدد صحیح مثبت به تومان باشه.",
          };
        if (input.amount > MAX_AMOUNT)
          return { ok: false, error: "مبلغ بیشتر از حد مجازه." };

        const payer = members.find((m) => m.id === input.payerId);
        if (!payer) return { ok: false, error: "پرداخت‌کننده رو انتخاب کن." };

        const ids = [...new Set(input.participantIds)];
        if (ids.length === 0)
          return { ok: false, error: "حداقل یک نفر باید توی این خرج سهیم باشه." };
        const ordered = members
          .filter((m) => ids.includes(m.id))
          .map((m) => m.id);
        if (ordered.length !== ids.length)
          return { ok: false, error: "لیست سهیم‌ها معتبر نیست." };

        let participants: Expense["participants"];
        if (input.splitType === "custom") {
          const shares = input.customShares ?? {};
          participants = ordered.map((memberId) => ({
            memberId,
            shareAmount: Number(shares[memberId]),
          }));
          if (
            participants.some(
              (p) => !Number.isInteger(p.shareAmount) || p.shareAmount < 0
            )
          ) {
            return {
              ok: false,
              error: "سهم هر نفر باید یه عدد صحیح نامنفی به تومان باشه.",
            };
          }
          const sum = participants.reduce((s, p) => s + p.shareAmount, 0);
          if (sum !== input.amount) {
            return {
              ok: false,
              error: `جمع سهم‌ها (${fmt(sum)} تومان) با مبلغ هزینه (${fmt(
                input.amount
              )} تومان) برابر نیست.`,
            };
          }
        } else {
          participants = splitEqually(input.amount, ordered);
        }

        set((s) => ({
          expenses: [
            {
              id: uid(),
              title,
              amount: input.amount,
              splitType: input.splitType,
              payerId: payer.id,
              participants,
              createdAt: new Date().toISOString(),
            },
            ...s.expenses,
          ],
        }));
        return { ok: true };
      },

      removeExpense: (id) =>
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

      replaceAll: (members, expenses) => set({ members, expenses }),

      resetAll: () => set({ members: [], expenses: [] }),
    }),
    {
      name: "dang-hesab-v1",
      version: 1,
      skipHydration: true,
      partialize: (s) => ({ members: s.members, expenses: s.expenses }),
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/**
 * تا وقتی store از localStorage بازیابی نشده، true نمی‌شه.
 * برای جلوگیری از mismatch بین رندر سرور و کلاینت.
 */
export function useDangHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let mounted = true;
    const finish = () => {
      if (mounted) setHydrated(true);
    };
    const unsubscribe = useDangStore.persist.onFinishHydration(finish);
    const result = useDangStore.persist.rehydrate() as
      | Promise<void>
      | undefined;
    if (result && typeof result.then === "function") {
      result.then(finish).catch(finish);
    }
    if (useDangStore.persist.hasHydrated()) finish();
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);
  return hydrated;
}
