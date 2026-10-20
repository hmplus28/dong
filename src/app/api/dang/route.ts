import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { toExpenseDTO, toMemberDTO } from "@/lib/dang/server";

export async function GET() {
  const [members, expenses] = await Promise.all([
    db.member.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    db.expense.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { participations: { orderBy: { id: "asc" } } },
    }),
  ]);

  return NextResponse.json(
    {
      members: members.map(toMemberDTO),
      expenses: expenses.map(toExpenseDTO),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
