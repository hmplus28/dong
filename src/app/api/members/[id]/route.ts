import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { badRequest } from "@/lib/dang/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const member = await db.member.findUnique({ where: { id } });
  if (!member) return badRequest("عضو پیدا نشد.", 404);

  // اگه عضو توی هزینه‌ای نقش داشته باشه، حذفش حساب‌ها رو خراب می‌کنه
  const [paidCount, partCount] = await Promise.all([
    db.expense.count({ where: { payerId: id } }),
    db.expenseParticipant.count({ where: { memberId: id } }),
  ]);
  if (paidCount > 0 || partCount > 0) {
    return badRequest(
      "این عضو توی هزینه‌ها استفاده شده؛ اول هزینه‌های مربوط رو حذف کن.",
      409
    );
  }

  await db.member.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
