import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { badRequest } from "@/lib/dang/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const expense = await db.expense.findUnique({ where: { id } });
  if (!expense) return badRequest("هزینه پیدا نشد.", 404);

  // سهم‌ها به‌صورت Cascade حذف می‌شن
  await db.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
