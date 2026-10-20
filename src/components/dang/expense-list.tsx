"use client";

import { useMemo, useState } from "react";
import { ReceiptText, Trash2 } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatJalaliDate, formatMoney } from "@/lib/dang/format";
import { useDang } from "@/lib/dang/store";

export function ExpenseList() {
  const { members, expenses, removeExpense } = useDang();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const nameOf = useMemo(() => {
    const map = new Map(members.map((m) => [m.id, m.name]));
    return (id: string) => map.get(id) ?? "؟";
  }, [members]);

  const sorted = useMemo(
    () => [...expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [expenses]
  );

  async function handleDelete(id: string, title: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await removeExpense(id);
      if (res.ok) {
        toast.success(`«${title}» حذف شد و حساب‌ها دوباره محاسبه شدن.`);
      } else {
        toast.error(res.error);
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (sorted.length === 0) {
    return (
      <Card className="border-dashed py-10 shadow-none">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted">
            <ReceiptText className="size-6 text-muted-foreground" />
          </span>
          <p className="font-medium">هنوز هزینه‌ای ثبت نشده</p>
          <p className="text-sm text-muted-foreground">
            اولین خرج دورهمی رو از فرم بالا ثبت کن.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section
      aria-label="هزینه‌های ثبت‌شده"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">هزینه‌های ثبت‌شده</h2>
        <Badge variant="secondary">{formatMoney(sorted.length)} خرج</Badge>
      </div>
      <div className="grid max-h-[70vh] gap-3 overflow-y-auto pe-1">
        {sorted.map((e) => (
          <Card key={e.id} className="gap-0 py-0 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{e.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    پرداخت‌کننده:{" "}
                    <span className="font-medium text-foreground/80">
                      {nameOf(e.payerId)}
                    </span>
                    <span className="mx-1.5 text-border">|</span>
                    {formatJalaliDate(e.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  <div className="text-end leading-tight">
                    <p className="whitespace-nowrap text-base font-extrabold">
                      {formatMoney(e.amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">تومان</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        aria-label={`حذف هزینه ${e.title}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>حذف هزینه</AlertDialogTitle>
                        <AlertDialogDescription>
                          مطمئنی می‌خوای «{e.title}» رو حذف کنی؟ حساب‌ها دوباره
                          محاسبه می‌شن.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>نه، دست نگه‌دار</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(e.id, e.title)}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          آره، حذفش کن
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {e.participants.map((p) => (
                  <span
                    key={p.memberId}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs",
                      p.memberId === e.payerId
                        ? "bg-primary/10 text-primary ring-1 ring-primary/25"
                        : "bg-muted"
                    )}
                  >
                    {nameOf(p.memberId)}
                    <span className="ms-1 text-muted-foreground">
                      {formatMoney(p.shareAmount)}
                    </span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
