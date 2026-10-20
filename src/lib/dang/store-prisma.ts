import type { Expense, Member } from "./types";
import type { SplitType } from "./types";
import {
  StoreError,
  extractMemberName,
  validateExpenseInput,
  validateReplaceBody,
  type DataStore,
} from "./store-core";

/**
 * پیاده‌سازی Prisma (SQLite لوکال / PostgreSQL پروداکشن).
 * کلاینت Prisma اینجا «تنبل» ایمپورت می‌شه تا مسیر نتلیفای (Netlify Blobs)
 * هرگز به دیتابیس‌فایل و باینری‌های پراسیما دست نزنه.
 */

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

function toMemberDTO(m: MemberRow): Member {
  return { id: m.id, name: m.name, createdAt: m.createdAt.toISOString() };
}

function toExpenseDTO(e: ExpenseRow): Expense {
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

export async function createPrismaStore(): Promise<DataStore> {
  const { db } = await import("@/lib/db");

  return {
    async listAll() {
      const [members, expenses] = await Promise.all([
        db.member.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
        db.expense.findMany({
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: { participations: { orderBy: { id: "asc" } } },
        }),
      ]);
      return {
        members: members.map(toMemberDTO),
        expenses: expenses.map(toExpenseDTO),
      };
    },

    async addMember(body) {
      const name = extractMemberName(body);
      const existing = await db.member.findFirst({ where: { name } });
      if (existing) {
        throw new StoreError(`«${name}» قبلاً عضو شده.`, 409);
      }
      const member = await db.member.create({ data: { name } });
      return toMemberDTO(member);
    },

    async removeMember(id) {
      const member = await db.member.findUnique({ where: { id } });
      if (!member) throw new StoreError("عضو پیدا نشد.", 404);

      // اگه عضو توی هزینه‌ای نقش داشته باشه، حذفش حساب‌ها رو خراب می‌کنه
      const [paidCount, partCount] = await Promise.all([
        db.expense.count({ where: { payerId: id } }),
        db.expenseParticipant.count({ where: { memberId: id } }),
      ]);
      if (paidCount > 0 || partCount > 0) {
        throw new StoreError(
          "این عضو توی هزینه‌ها استفاده شده؛ اول هزینه‌های مربوط رو حذف کن.",
          409
        );
      }

      await db.member.delete({ where: { id } });
    },

    async addExpense(body) {
      const memberRows = await db.member.findMany({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      const input = validateExpenseInput(
        body,
        memberRows.map(toMemberDTO)
      );

      const expense = await db.expense.create({
        data: {
          title: input.title,
          amount: input.amount,
          splitType: input.splitType,
          payerId: input.payerId,
          participations: { create: input.participants },
        },
        include: { participations: { orderBy: { id: "asc" } } },
      });
      return toExpenseDTO(expense);
    },

    async removeExpense(id) {
      const expense = await db.expense.findUnique({ where: { id } });
      if (!expense) throw new StoreError("هزینه پیدا نشد.", 404);

      // سهم‌ها به‌صورت Cascade حذف می‌شن
      await db.expense.delete({ where: { id } });
    },

    async replaceAll(body) {
      const data = validateReplaceBody(body);
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
        throw new StoreError(
          "بازیابی انجام نشد؛ فایل پشتیبان رو دوباره بررسی کن.",
          500
        );
      }
    },

    async resetAll() {
      await db.$transaction([
        db.expenseParticipant.deleteMany({}),
        db.expense.deleteMany({}),
        db.member.deleteMany({}),
      ]);
    },
  };
}
