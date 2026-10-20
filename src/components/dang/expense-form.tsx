"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Plus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/dang/format";
import { useDang } from "@/lib/dang/store";
import { MAX_AMOUNT, type SplitType } from "@/lib/dang/types";
import { MoneyInput } from "./money-input";

interface ExpenseFormProps {
  onGoToMembers: () => void;
}

export function ExpenseForm({ onGoToMembers }: ExpenseFormProps) {
  const { members, addExpense } = useDang();
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [customShares, setCustomShares] = useState<
    Record<string, number | null>
  >({});

  // مقصود کاربر؛ تا وقتی دست نزنه، پیش‌فرض «همه» انتخابن
  const [rawPayerId, setRawPayerId] = useState("");
  const [rawSelected, setRawSelected] = useState<string[] | null>(null);

  // حالت مؤثر: همیشه با لیست اعضای فعلی سازگاره (حذف عضو خودکار اصلاح می‌شه)
  const payerId = members.some((m) => m.id === rawPayerId)
    ? rawPayerId
    : (members[0]?.id ?? "");
  const selected =
    rawSelected === null
      ? members.map((m) => m.id)
      : rawSelected.filter((id) => members.some((m) => m.id === id));

  const selectedMembers = useMemo(
    () => members.filter((m) => selected.includes(m.id)),
    [members, selected]
  );

  const equalPreview = useMemo(() => {
    if (amount === null || amount <= 0 || selectedMembers.length === 0)
      return null;
    const base = Math.floor(amount / selectedMembers.length);
    const remainder = amount - base * selectedMembers.length;
    return { base, remainder };
  }, [amount, selectedMembers.length]);

  const customSum = useMemo(
    () => selectedMembers.reduce((sum, m) => sum + (customShares[m.id] ?? 0), 0),
    [selectedMembers, customShares]
  );

  function toggleParticipant(id: string) {
    setRawSelected(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id]
    );
  }

  function handlePayerChange(id: string) {
    setRawPayerId(id);
    if (!selected.includes(id)) setRawSelected([...selected, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amount === null) {
      toast.error("مبلغ هزینه رو وارد کن.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await addExpense({
        title,
        amount,
        payerId,
        participantIds: selected,
        splitType,
        customShares:
          splitType === "custom"
            ? Object.fromEntries(
                selectedMembers.map((m) => [m.id, customShares[m.id] ?? 0])
              )
            : undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("هزینه ثبت شد.");
      setTitle("");
      setAmount(null);
      setCustomShares({});
    } finally {
      setSubmitting(false);
    }
  }

  if (members.length === 0) {
    return (
      <Card className="border-dashed py-10 shadow-none">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted">
            <Users className="size-7 text-muted-foreground" />
          </span>
          <div>
            <p className="font-semibold">اول اعضا رو تعریف کن</p>
            <p className="mt-1 text-sm text-muted-foreground">
              برای ثبت هزینه، اسم رفیق‌ها رو اضافه کن (لاگین و ثبت‌نام لازم
              نیست).
            </p>
          </div>
          <Button onClick={onGoToMembers}>
            <UserPlus className="size-4" />
            تعریف اعضا
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <form onSubmit={handleSubmit}>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">ثبت هزینه جدید</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="expense-title">عنوان هزینه</Label>
              <Input
                id="expense-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً شام کباب"
                maxLength={80}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expense-amount">مبلغ (تومان)</Label>
              <MoneyInput
                id="expense-amount"
                value={amount}
                onValueChange={setAmount}
                placeholder="مثلاً ۱٬۲۵۰٬۰۰۰"
              />
              {amount !== null && amount > MAX_AMOUNT && (
                <p className="text-xs text-destructive">
                  مبلغ بیشتر از حد مجازه.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="payer">کی پرداخت کرده؟</Label>
              <Select value={payerId} onValueChange={handlePayerChange}>
                <SelectTrigger id="payer" className="w-full">
                  <SelectValue placeholder="انتخاب پرداخت‌کننده" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>نحوه تقسیم</Label>
              <div className="inline-grid w-full grid-cols-2 rounded-lg border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setSplitType("equal")}
                  aria-pressed={splitType === "equal"}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    splitType === "equal"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  تقسیم مساوی
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType("custom")}
                  aria-pressed={splitType === "custom"}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    splitType === "custom"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  مبالغ دلخواه
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>سهیم‌های این خرج</Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setRawSelected(members.map((m) => m.id))}
                >
                  همه
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setRawSelected([])}
                >
                  هیچ‌کدوم
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const on = selected.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleParticipant(m.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background text-foreground hover:bg-accent"
                    )}
                  >
                    {m.name}
                    {on && <Check className="size-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {splitType === "equal" && equalPreview && (
            <p className="text-xs text-muted-foreground">
              {equalPreview.remainder === 0
                ? `سهم هر نفر دقیقاً ${formatMoney(equalPreview.base)} تومانه.`
                : `مبلغ بر تعداد نفرات بخش‌پذیر نیست؛ سهم هر نفر بین ${formatMoney(
                    equalPreview.base
                  )} و ${formatMoney(equalPreview.base + 1)} تومان می‌شه.`}
            </p>
          )}

          {splitType === "custom" && selectedMembers.length > 0 && (
            <div className="grid gap-3 rounded-lg border bg-muted/30 p-3">
              {selectedMembers.map((m) => (
                <div
                  key={m.id}
                  className="grid gap-1.5 sm:grid-cols-[1fr_200px] sm:items-center sm:gap-3"
                >
                  <Label
                    htmlFor={`share-${m.id}`}
                    className="text-sm font-medium sm:text-start"
                  >
                    {m.name}
                  </Label>
                  <MoneyInput
                    id={`share-${m.id}`}
                    value={customShares[m.id] ?? null}
                    onValueChange={(v) =>
                      setCustomShares((prev) => ({ ...prev, [m.id]: v }))
                    }
                    placeholder="سهم به تومان"
                  />
                </div>
              ))}
              <p
                className={cn(
                  "text-xs",
                  customSum === amount
                    ? "text-muted-foreground"
                    : "font-medium text-destructive"
                )}
              >
                جمع سهم‌ها: {formatMoney(customSum)} از{" "}
                {formatMoney(amount ?? 0)} تومان
              </p>
            </div>
          )}

          <div>
            <Button
              type="submit"
              disabled={submitting || (amount !== null && amount > MAX_AMOUNT)}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {submitting ? "در حال ثبت…" : "ثبت هزینه"}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
