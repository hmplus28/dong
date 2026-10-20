import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  badRequest,
  isObject,
  toExpenseDTO,
} from "@/lib/dang/server";
import { splitEqually } from "@/lib/dang/settlement";
import {
  MAX_AMOUNT,
  MAX_TITLE_LENGTH,
} from "@/lib/dang/types";

function fmt(n: number): string {
  try {
    return n.toLocaleString("fa-IR");
  } catch {
    return String(n);
  }
}

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  if (!isObject(body)) return badRequest("درخواست معتبر نیست.");

  // ── عنوان ───────────────────────────────────────────────
  if (typeof body.title !== "string") {
    return badRequest("عنوان هزینه رو بنویس.");
  }
  const title = body.title.trim().replace(/\s+/g, " ");
  if (!title) return badRequest("عنوان هزینه رو بنویس.");
  if (title.length > MAX_TITLE_LENGTH) {
    return badRequest("عنوان نباید بیشتر از ۸۰ حرف باشه.");
  }

  // ── مبلغ ────────────────────────────────────────────────
  const amount = body.amount;
  if (
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return badRequest("مبلغ باید یه عدد صحیح مثبت به تومان باشه.");
  }
  if (amount > MAX_AMOUNT) return badRequest("مبلغ بیشتر از حد مجازه.");

  // ── نوع تقسیم ───────────────────────────────────────────
  const splitType = body.splitType;
  if (splitType !== "equal" && splitType !== "custom") {
    return badRequest("نوع تقسیم معتبر نیست.");
  }

  // ── پرداخت‌کننده ────────────────────────────────────────
  if (typeof body.payerId !== "string") {
    return badRequest("پرداخت‌کننده رو انتخاب کن.");
  }
  const members = await db.member.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const payer = members.find((m) => m.id === body.payerId);
  if (!payer) return badRequest("پرداخت‌کننده رو انتخاب کن.");

  // ── سهیم‌ها ─────────────────────────────────────────────
  if (
    !Array.isArray(body.participantIds) ||
    body.participantIds.some((x) => typeof x !== "string")
  ) {
    return badRequest("لیست سهیم‌ها معتبر نیست.");
  }
  const ids = [...new Set(body.participantIds as string[])];
  if (ids.length === 0) {
    return badRequest("حداقل یک نفر باید توی این خرج سهیم باشه.");
  }
  // ترتیب پایدار: بر اساس ترتیب اعضا (ساختار فعلی گروه)
  const ordered = members
    .filter((m) => ids.includes(m.id))
    .map((m) => m.id);
  if (ordered.length !== ids.length) {
    return badRequest("لیست سهیم‌ها معتبر نیست.");
  }

  // ── محاسبه سهم‌ها (سمت سرور، بدون خطای اعشاری) ─────────
  let participants: { memberId: string; shareAmount: number }[];
  if (splitType === "custom") {
    const shares = body.customShares;
    if (!isObject(shares)) return badRequest("سهم‌ها معتبر نیست.");
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
      return badRequest("سهم هر نفر باید یه عدد صحیح نامنفی به تومان باشه.");
    }
    const sum = participants.reduce((s, p) => s + p.shareAmount, 0);
    if (sum !== amount) {
      return badRequest(
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
    return badRequest("جمع سهم‌ها با مبلغ هزینه برابر نیست.");
  }

  const expense = await db.expense.create({
    data: {
      title,
      amount,
      splitType,
      payerId: payer.id,
      participations: { create: participants },
    },
    include: { participations: { orderBy: { id: "asc" } } },
  });

  return NextResponse.json(
    { expense: toExpenseDTO(expense) },
    { status: 201 }
  );
}
