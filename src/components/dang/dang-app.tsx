"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  HandCoins,
  ReceiptText,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { computeBalances, computeTransfers } from "@/lib/dang/settlement";
import { useDangHydrated, useDangStore } from "@/lib/dang/store";
import { formatMoney } from "@/lib/dang/format";
import { ExpenseForm } from "./expense-form";
import { ExpenseList } from "./expense-list";
import { MembersPanel } from "./members-panel";
import { SettlementPanel } from "./settlement-panel";
import { SummaryCards } from "./summary-cards";
import { ThemeToggle } from "./theme-toggle";

type TabKey = "expenses" | "members" | "settlement";

export function DangApp() {
  const members = useDangStore((s) => s.members);
  const expenses = useDangStore((s) => s.expenses);
  const hydrated = useDangHydrated();

  const [tab, setTab] = useState<TabKey>("expenses");
  const [wasHydrated, setWasHydrated] = useState(false);

  // الگوی رسمی React برای تنظیم state هنگام render (فقط بار اول بعد از hydration):
  // اگه هنوز عضوی تعریف نشده، مستقیم برو سراغ تب اعضا
  if (hydrated && !wasHydrated) {
    setWasHydrated(true);
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
            {hydrated && expenses.length > 0 && (
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
        {!hydrated ? (
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
          دنگ‌حساب — همه داده‌ها فقط روی مرورگر خودت ذخیره می‌شه؛ برای منتقل‌کردنشون
          از پشتیبان‌گیری استفاده کن.
        </div>
      </footer>
    </div>
  );
}
