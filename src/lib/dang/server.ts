import { NextResponse } from "next/server";

import type { Expense, Member, SplitType } from "./types";

/** پاسخ خطای استاندارد با پیام فارسی */
export function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

interface MemberRow {
  id: string;
  name: string;
  createdAt: Date;
}

interface ParticipantRow {
  memberId: string;
  shareAmount: number;
}

interface ExpenseRow {
  id: string;
  title: string;
  amount: number;
  splitType: string;
  payerId: string;
  createdAt: Date;
  participations: ParticipantRow[];
}

export function toMemberDTO(m: MemberRow): Member {
  return { id: m.id, name: m.name, createdAt: m.createdAt.toISOString() };
}

export function toExpenseDTO(e: ExpenseRow): Expense {
  return {
    id: e.id,
    title: e.title,
    amount: e.amount,
    splitType: e.splitType as SplitType,
    payerId: e.payerId,
    createdAt: e.createdAt.toISOString(),
    participants: e.participations.map((p) => ({
      memberId: p.memberId,
      shareAmount: p.shareAmount,
    })),
  };
}
