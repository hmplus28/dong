"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  CloudUpload,
  HandCoins,
  Loader2,
  ReceiptText,
  RefreshCw,
  TriangleAlert,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { computeBalances, computeTransfers } from "@/lib/dang/settlement";
import { useDang } from "@/lib/dang/store";
import { formatMoney } from "@/lib/dang/format";
import { ExpenseForm } from "./expense-form";
import { ExpenseList } from "./expense-list";
import { MembersPanel } from "./members-panel";
import { SettlementPanel } from "./settlement-panel";
import { SummaryCards } from "./summary-cards";
import { ThemeToggle } from "./theme-toggle";

type TabKey = "expenses" | "members" | "settlement";

export function DangApp() {
  const {
    members,
    expenses,
    loading,
    loadError,
    reload,
    legacyData,
    importLegacy,
    dismissLegacy,
  } = useDang();

  const [tab, setTab] = useState<TabKey>("expenses");
  const [wasLoaded, setWasLoaded] = useState(false);

  // الگوی رسمی React برای تنظیم state هنگام render (فقط بار اول بعد از لود):
  // اگه هنوز عضوی تعریف نشده، مستقیم برو سراغ تب اعضا
  if (!loading && !wasLoaded) {
    setWasLoaded(true);
    if (members.length === 0) setTab("members");
  }

  const balances = useMemo(
    () => computeBalances(members, expenses),
    [members, expenses]
  );
  const transfers = useMemo(() => computeTransfers(balances), [balances]);
  const totalAmount = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );
  const openDebt = useMemo(
    () =>
      balances.reduce((sum, b) => sum + (b.balance < 0 ? -b.balance : 0), 0),
    [balances]
  );
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    if (retrying) return;
    setRetrying(true);
    try {
      await reload();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <HandCoins className="size-5" />
            </div>
            <div className="leading-tight">
              <h1 className="text-lg font-extrabold">دنگ‌حساب</h1>
              <p className="text-xs text-muted-foreground">
                حساب دنگ‌های دورهمی
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!loading && expenses.length > 0 && (
              <div className="hidden flex-col items-end leading-tight sm:flex">
                <span className="text-[11px] text-muted-foreground">
                  جمع هزینه‌ها
                </span>
                <span className="text-sm font-bold">
                  {formatMoney(totalAmount)}
                  <span className="ms-1 text-[10px] font-normal text-muted-foreground">
                    تومان
                  </span>
                </span>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 pb-10 pt-6">
        {loading ? (
          <div className="flex flex-col gap-6" aria-busy="true">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        ) : (
          <>
            {loadError && (
              <div
                role="alert"
                className="flex flex-col items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-2.5">
                  <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-sm font-bold">
                      داده‌ها از سرور گرفته نشد
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {loadError}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  disabled={retrying}
                  className="shrink-0"
                >
                  {retrying ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  تلاش دوباره
                </Button>
              </div>
            )}

            <SummaryCards
              totalAmount={totalAmount}
              expenseCount={expenses.length}
              memberCount={members.length}
              openDebt={openDebt}
              transferCount={transfers.length}
            />

            <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="expenses" className="gap-1.5">
                  <ReceiptText className="size-4" />
                  هزینه‌ها
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-[10px]"
                  >
                    {formatMoney(expenses.length)}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="members" className="gap-1.5">
                  <Users className="size-4" />
                  اعضا
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-[10px]"
                  >
                    {formatMoney(members.length)}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="settlement" className="gap-1.5">
                  <ArrowLeftRight className="size-4" />
                  تسویه حساب
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="expenses"
                forceMount
                className="mt-4 flex flex-col gap-6 data-[state=inactive]:hidden"
              >
                <ExpenseForm onGoToMembers={() => setTab("members")} />
                <ExpenseList />
              </TabsContent>

              <TabsContent
                value="members"
                forceMount
                className="mt-4 data-[state=inactive]:hidden"
              >
                <MembersPanel balances={balances} />
              </TabsContent>

              <TabsContent
                value="settlement"
                forceMount
                className="mt-4 data-[state=inactive]:hidden"
              >
                <SettlementPanel
                  balances={balances}
                  transfers={transfers}
                  expenseCount={expenses.length}
                  onGoToExpenses={() => setTab("expenses")}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto w-full max-w-4xl px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs leading-relaxed text-muted-foreground">
          دنگ‌حساب — داده‌ها روی سرور ذخیره می‌شن و از هر مرورگری در دسترسن.
        </div>
      </footer>

      <LegacyMigrationDialog
        open={!loading && members.length === 0 && legacyData !== null}
        legacyData={legacyData}
        onImport={importLegacy}
        onDismiss={dismissLegacy}
      />
    </div>
  );
}

/** پیشنهاد انتقال داده‌های قدیمی (نسخه‌ی مرورگری) به سرور */
function LegacyMigrationDialog({
  open,
  legacyData,
  onImport,
  onDismiss,
}: {
  open: boolean;
  legacyData: { members: unknown[]; expenses: unknown[] } | null;
  onImport: () => Promise<{ ok: boolean; error?: string }>;
  onDismiss: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleImport() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await onImport();
      if (res.ok) {
        toast.success("داده‌های قدیمی با موفقیت به سرور منتقل شد.");
      } else {
        toast.error(res.error ?? "انتقال انجام نشد.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!legacyData) return null;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CloudUpload className="size-5 text-primary" />
            انتقال داده‌های قدیمی به سرور
          </AlertDialogTitle>
          <AlertDialogDescription>
            توی این مرورگر {formatMoney(legacyData.members.length)} عضو و{" "}
            {formatMoney(legacyData.expenses.length)} هزینه از نسخه‌ی قبلی
            دنگ‌حساب (که فقط روی مرورگر ذخیره می‌شد) پیدا شد. الان همه‌چیز روی
            سرور ذخیره می‌شه؛ می‌خوای این داده‌ها منتقل بشن؟
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDismiss} disabled={busy}>
            بی‌خیال
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleImport} disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CloudUpload className="size-4" />
            )}
            منتقل کن
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
