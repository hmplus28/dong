export type SplitType = "equal" | "custom";

/** سقف‌های مجاز */
export const MAX_AMOUNT = 2_000_000_000;
export const MAX_TITLE_LENGTH = 80;
export const MAX_NAME_LENGTH = 40;

export interface Member {
  id: string;
  name: string;
  createdAt: string;
}

export interface ExpenseParticipant {
  memberId: string;
  shareAmount: number;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  splitType: SplitType;
  payerId: string;
  participants: ExpenseParticipant[];
  createdAt: string;
}

export interface MemberBalance {
  memberId: string;
  name: string;
  paid: number;
  owed: number;
  /** paid - owed؛ مثبت یعنی بستانکار، منفی یعنی بدهکار */
  balance: number;
}

export interface Transfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface ExpenseInput {
  title: string;
  amount: number;
  payerId: string;
  participantIds: string[];
  splitType: SplitType;
  customShares?: Record<string, number>;
}

export interface Result {
  ok: boolean;
  error?: string;
}
