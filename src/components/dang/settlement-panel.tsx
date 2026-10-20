"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Info,
  PartyPopper,
  ReceiptText,
  Scale,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MemberBalance, Transfer } from "@/lib/dang/types";
import { formatMoney } from "@/lib/dang/format";

interface SettlementPanelProps {
  balances: MemberBalance[];
  transfers: Transfer[];
  expenseCount: number;
  onGoToExpenses: () => void;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function SettlementPanel({
  balances,
  transfers,
  expenseCount,
  onGoToExpenses,
}: SettlementPanelProps) {
  if (expenseCount === 0) {
    return (
      <Card className="border-dashed py-10 shadow-none">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Scale className="size-6 text-muted-foreground" />
          </span>
          <p className="font-medium">هنوز چیزی برای تسویه نیست</p>
          <p className="text-sm text-muted-foreground">
            وقتی هزینه‌ها ثبت بشن، اینجا می‌گم هر کی باید به کی چقدر بزنه.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onGoToExpenses}
            className="mt-1"
          >
            <ReceiptText className="size-4" />
            ثبت اولین هزینه
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-0 py-0 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4">
          <p className="font-semibold">وضعیت حساب هر نفر</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {balances.map((b) => (
              <div
                key={b.memberId}
                className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2"
              >
                <span className="truncate text-sm font-medium">{b.name}</span>
                {b.balance === 0 ? (
                  <Badge variant="secondary">تسویه</Badge>
                ) : b.balance > 0 ? (
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                    بستانکار {formatMoney(b.balance)}
                  </Badge>
                ) : (
                  <Badge className="bg-rose-600 text-white hover:bg-rose-600">
                    بدهکار {formatMoney(-b.balance)}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">چطوری تسویه کنیم؟</h2>
          <Badge variant="secondary">
            {formatMoney(transfers.length)} واریز
          </Badge>
        </div>

        {transfers.length === 0 ? (
          <Card className="border-emerald-500/40 bg-emerald-500/5 py-8 shadow-none">
            <CardContent className="flex flex-col items-center gap-2 text-center">
              <PartyPopper className="size-8 text-emerald-600" />
              <p className="font-bold text-emerald-700 dark:text-emerald-400">
                همه تسویه هستن!
              </p>
              <p className="text-sm text-muted-foreground">
                هیچ‌کس به هیچ‌کس بدهی نداره.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {transfers.map((t, i) => (
              <TransferCard key={`${t.fromId}-${t.toId}-${i}`} t={t} />
            ))}
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              لیست طوری بهینه شده که با کمترین تعداد واریز، حساب همه اعضا
              تسویه بشه.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function TransferCard({ t }: { t: Transfer }) {
  const [copied, setCopied] = useState(false);
  const message = `${t.fromName} باید ${formatMoney(t.amount)} تومان به ${
    t.toName
  } بزنه`;

  async function handleCopy() {
    const ok = await copyText(message);
    if (ok) {
      setCopied(true);
      toast.success("پیام تسویه کپی شد؛ بفرستش تو گروه.");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("کپی نشد؛ می‌تونی دستی بنویسش.");
    }
  }

  return (
    <Card className="gap-0 py-0 shadow-sm">
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="size-9 border">
            <AvatarFallback className="bg-rose-500/10 text-xs font-bold text-rose-600">
              {t.fromName.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{t.fromName}</p>
            <p className="text-[10px] text-muted-foreground">می‌ده</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center gap-0.5 px-2">
          <ArrowLeft
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="whitespace-nowrap text-sm font-extrabold text-primary">
            {formatMoney(t.amount)}
            <span className="ms-1 text-[10px] font-normal text-muted-foreground">
              تومان
            </span>
          </p>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="size-9 border">
            <AvatarFallback className="bg-emerald-500/10 text-xs font-bold text-emerald-600">
              {t.toName.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{t.toName}</p>
            <p className="text-[10px] text-muted-foreground">می‌گیره</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
          aria-label="کپی پیام تسویه"
        >
          {copied ? (
            <Check className="size-4 text-emerald-600" />
          ) : (
            <Copy className="size-4" />
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
