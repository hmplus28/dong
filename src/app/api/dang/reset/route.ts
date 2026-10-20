import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/** پاک‌کردن کل داده‌ها (اعضا و هزینه‌ها) */
export async function POST() {
  await db.$transaction([
    db.expenseParticipant.deleteMany({}),
    db.expense.deleteMany({}),
    db.member.deleteMany({}),
  ]);
  return NextResponse.json({ ok: true });
}
