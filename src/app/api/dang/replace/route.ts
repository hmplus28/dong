import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { badRequest } from "@/lib/dang/server";
import { validateBackup } from "@/lib/dang/backup";

/** بازیابی کامل داده‌ها از فایل پشتیبان (جایگزین همه‌چیز می‌شه) */
export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  const res = validateBackup(body);
  if (!res.ok) return badRequest(res.error);

  const data = res.data;
  const validDate = (s: string) => !Number.isNaN(new Date(s).getTime());
  if (
    !data.members.every((m) => validDate(m.createdAt)) ||
    !data.expenses.every((e) => validDate(e.createdAt))
  ) {
    return badRequest("تاریخ‌های فایل پشتیبان معتبر نیست.");
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.expenseParticipant.deleteMany({});
      await tx.expense.deleteMany({});
      await tx.member.deleteMany({});

      if (data.members.length > 0) {
        await tx.member.createMany({
          data: data.members.map((m) => ({
            id: m.id,
            name: m.name,
            createdAt: new Date(m.createdAt),
          })),
        });
      }

      for (const e of data.expenses) {
        await tx.expense.create({
          data: {
            id: e.id,
            title: e.title,
            amount: e.amount,
            splitType: e.splitType,
            payerId: e.payerId,
            createdAt: new Date(e.createdAt),
            participations: {
              create: e.participants.map((p) => ({
                memberId: p.memberId,
                shareAmount: p.shareAmount,
              })),
            },
          },
        });
      }
    });
  } catch (err) {
    console.error("[dang/replace] failed:", err);
    return badRequest("بازیابی انجام نشد؛ فایل پشتیبان رو دوباره بررسی کن.");
  }

  return NextResponse.json({ ok: true });
}
