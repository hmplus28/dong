"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BACKUP_APP,
  BACKUP_VERSION,
  buildBackup,
  validateBackup,
  type BackupFile,
} from "./backup";
import type { Expense, ExpenseInput, Member, Result } from "./types";

/**
 * لایه‌ی داده‌ی اپ — دیگر هیچ چیزی روی مرورگر ذخیره نمی‌شه؛
 * همه‌ی داده‌ها روی سرور (دیتابیس) هستن و از طریق API خونده/نوشته می‌شن.
 * این Provider وضعیت مشترک رو نگه می‌داره و اکشن‌ها رو با سرور همگام می‌کنه.
 */

/** کلید داده‌های نسخه‌ی قبلی (کلاینت‌بیس) توی localStorage مرورگر */
const LEGACY_KEY = "dang-hesab-v1";

interface DangContextValue {
  members: Member[];
  expenses: Expense[];
  /** بار اول در حال دریافت از سرور است */
  loading: boolean;
  /** اگه دریافت داده‌ها از سرور شکست خورده باشه، پیام فارسی خطا */
  loadError: string | null;
  reload: () => Promise<void>;
  addMember: (rawName: string) => Promise<Result>;
  removeMember: (id: string) => Promise<Result>;
  addExpense: (input: ExpenseInput) => Promise<Result>;
  removeExpense: (id: string) => Promise<Result>;
  replaceAll: (members: Member[], expenses: Expense[]) => Promise<Result>;
  resetAll: () => Promise<Result>;
  /** داده‌ی قدیمی مرورگر (نسخه‌ی قبلی اپ) برای انتقال به سرور */
  legacyData: BackupFile | null;
  importLegacy: () => Promise<Result>;
  dismissLegacy: () => void;
}

const DangContext = createContext<DangContextValue | null>(null);

interface FetchOutcome {
  status: number;
  body: Record<string, unknown>;
}

async function requestJson(
  url: string,
  init?: RequestInit
): Promise<FetchOutcome> {
  try {
    const res = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    const body = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    return { status: res.status, body };
  } catch {
    return {
      status: 0,
      body: {
        error: "اتصال به سرور برقرار نشد؛ یه لحظه بعد دوباره امتحان کن.",
      },
    };
  }
}

function errorOf(body: Record<string, unknown>, fallback: string): string {
  return typeof body.error === "string" && body.error ? body.error : fallback;
}

/**
 * داده‌های نسخه‌ی قدیمی اپ (که روی localStorage ذخیره می‌شد) رو پیدا می‌کنه
 * تا اگه کاربر بخواد، به سرور منتقل بشن.
 */
function readLegacyData(): BackupFile | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    // فرمت zustand/persist: { state: { members, expenses }, version }
    const state =
      parsed && typeof parsed === "object" && "state" in parsed
        ? (parsed as { state?: unknown }).state
        : parsed;
    if (typeof state !== "object" || state === null) return null;
    const { members, expenses } = state as Record<string, unknown>;
    const res = validateBackup({
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      members,
      expenses,
    });
    if (res.ok && res.data.members.length > 0) return res.data;
    return null;
  } catch {
    return null;
  }
}

export function DangProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [legacyData, setLegacyData] = useState<BackupFile | null>(null);

  const reload = useCallback(async () => {
    const { status, body } = await requestJson("/api/dang");
    if (status !== 200) {
      setLoadError(
        errorOf(body, "دریافت داده‌ها از سرور ممکن نشد.")
      );
      return;
    }
    setLoadError(null);
    setMembers(Array.isArray(body.members) ? (body.members as Member[]) : []);
    setExpenses(
      Array.isArray(body.expenses) ? (body.expenses as Expense[]) : []
    );
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const legacy = readLegacyData();
      await reload();
      if (!alive) return;
      if (legacy) setLegacyData(legacy);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [reload]);

  const addMember = useCallback(
    async (rawName: string): Promise<Result> => {
      const { status, body } = await requestJson("/api/members", {
        method: "POST",
        body: JSON.stringify({ name: rawName }),
      });
      if (status === 201) {
        await reload();
        return { ok: true };
      }
      return { ok: false, error: errorOf(body, "عضو اضافه نشد.") };
    },
    [reload]
  );

  const removeMember = useCallback(
    async (id: string): Promise<Result> => {
      const { status, body } = await requestJson(
        `/api/members/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (status === 200) {
        await reload();
        return { ok: true };
      }
      return { ok: false, error: errorOf(body, "حذف عضو انجام نشد.") };
    },
    [reload]
  );

  const addExpense = useCallback(
    async (input: ExpenseInput): Promise<Result> => {
      const { status, body } = await requestJson("/api/expenses", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (status === 201) {
        await reload();
        return { ok: true };
      }
      return { ok: false, error: errorOf(body, "ثبت هزینه انجام نشد.") };
    },
    [reload]
  );

  const removeExpense = useCallback(
    async (id: string): Promise<Result> => {
      const { status, body } = await requestJson(
        `/api/expenses/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (status === 200) {
        await reload();
        return { ok: true };
      }
      return { ok: false, error: errorOf(body, "حذف هزینه انجام نشد.") };
    },
    [reload]
  );

  const replaceAll = useCallback(
    async (newMembers: Member[], newExpenses: Expense[]): Promise<Result> => {
      const { status, body } = await requestJson("/api/dang/replace", {
        method: "POST",
        body: JSON.stringify(buildBackup(newMembers, newExpenses)),
      });
      if (status === 200) {
        await reload();
        return { ok: true };
      }
      return { ok: false, error: errorOf(body, "بازیابی انجام نشد.") };
    },
    [reload]
  );

  const resetAll = useCallback(async (): Promise<Result> => {
    const { status, body } = await requestJson("/api/dang/reset", {
      method: "POST",
      body: "{}",
    });
    if (status === 200) {
      await reload();
      return { ok: true };
    }
    return { ok: false, error: errorOf(body, "پاک کردن انجام نشد.") };
  }, [reload]);

  const importLegacy = useCallback(async (): Promise<Result> => {
    if (!legacyData) return { ok: false, error: "داده‌ای برای انتقال نیست." };
    const res = await replaceAll(legacyData.members, legacyData.expenses);
    if (res.ok) {
      try {
        window.localStorage.removeItem(LEGACY_KEY);
      } catch {
        /* بی‌اهمیت */
      }
      setLegacyData(null);
    }
    return res;
  }, [legacyData, replaceAll]);

  const dismissLegacy = useCallback(() => {
    try {
      window.localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* بی‌اهمیت */
    }
    setLegacyData(null);
  }, []);

  const value = useMemo<DangContextValue>(
    () => ({
      members,
      expenses,
      loading,
      loadError,
      reload,
      addMember,
      removeMember,
      addExpense,
      removeExpense,
      replaceAll,
      resetAll,
      legacyData,
      importLegacy,
      dismissLegacy,
    }),
    [
      members,
      expenses,
      loading,
      loadError,
      reload,
      addMember,
      removeMember,
      addExpense,
      removeExpense,
      replaceAll,
      resetAll,
      legacyData,
      importLegacy,
      dismissLegacy,
    ]
  );

  return <DangContext.Provider value={value}>{children}</DangContext.Provider>;
}

export function useDang(): DangContextValue {
  const ctx = useContext(DangContext);
  if (!ctx) {
    throw new Error("useDang باید داخل DangProvider استفاده بشه.");
  }
  return ctx;
}
