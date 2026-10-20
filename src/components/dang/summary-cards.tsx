"use client";

import {
  ArrowLeftRight,
  TrendingDown,
  Users,
  Wallet,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/dang/format";

interface SummaryCardsProps {
  totalAmount: number;
  expenseCount: number;
  memberCount: number;
  openDebt: number;
  transferCount: number;
}

export function SummaryCards({
  totalAmount,
  expenseCount,
  memberCount,
  openDebt,
  transferCount,
}: SummaryCardsProps) {
  const items = [
    {
      label: "مجموع هزینه‌ها",
      value: formatMoney(totalAmount),
      unit: "تومان",
      sub: `${formatMoney(expenseCount)} خرج ثبت‌شده`,
      icon: Wallet,
      iconClass: "bg-primary/10 text-primary",
    },
    {
      label: "اعضای گروه",
      value: formatMoney(memberCount),
      unit: "نفر",
      sub: "بدون ثبت‌نام و دردسر",
      icon: Users,
      iconClass: "bg-primary/10 text-primary",
    },
    {
      label: "بدهی‌های باز",
      value: formatMoney(openDebt),
      unit: "تومان",
      sub: "پولی که باید جابه‌جا بشه",
      icon: TrendingDown,
      iconClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    },
    {
      label: "واریزهای لازم",
      value: formatMoney(transferCount),
      unit: "واریز",
      sub: "کمترین تعداد ممکن",
      icon: ArrowLeftRight,
      iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <section
      aria-label="خلاصه حساب"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {items.map((item) => (
        <Card key={item.label} className="gap-0 py-4 shadow-sm">
          <CardContent className="flex flex-col gap-1.5 px-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg",
                  item.iconClass
                )}
              >
                <item.icon className="size-4" />
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {item.label}
              </span>
            </div>
            <p className="truncate text-lg font-extrabold leading-tight">
              {item.value}
              <span className="ms-1 text-[10px] font-normal text-muted-foreground">
                {item.unit}
              </span>
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {item.sub}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
