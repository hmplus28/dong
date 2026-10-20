"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  DatabaseBackup,
  Download,
  Loader2,
  Trash2,
  Upload,
  UserPlus,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  downloadBackup,
  validateBackup,
  type BackupFile,
} from "@/lib/dang/backup";
import type { MemberBalance } from "@/lib/dang/types";
import { formatJalaliDate, formatMoney } from "@/lib/dang/format";
import { useDang } from "@/lib/dang/store";
import { normalizeName } from "@/lib/dang/utils";

interface MembersPanelProps {
  balances: MemberBalance[];
}

export function MembersPanel({ balances }: MembersPanelProps) {
  const {
    members,
    expenses,
    addMember,
    removeMember,
    replaceAll,
    resetAll,
  } = useDang();

  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [pendingImport, setPendingImport] = useState<BackupFile | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const hasData = members.length > 0 || expenses.length > 0;

  async function handleAddMember(e: FormEvent) {
    e.preventDefault();
    if (adding) return;
    setAdding(true);
    try {
      const res = await addMember(name);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`«${normalizeName(name)}» اضافه شد.`);
      setName("");
    } finally {
      setAdding(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const json: unknown = JSON.parse(text);
      const res = validateBackup(json);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setPendingImport(res.data);
    } catch {
      toast.error("فایل پشتیبان خونده نشد.");
    }
  }

  async function applyImport() {
    if (!pendingImport || importing) return;
    setImporting(true);
    try {
      const res = await replaceAll(
        pendingImport.members,
        pendingImport.expenses
      );
      if (res.ok) {
        toast.success(
          `بازیابی شد: ${formatMoney(
            pendingImport.members.length
          )} عضو و ${formatMoney(pendingImport.expenses.length)} هزینه.`
        );
        setPendingImport(null);
      } else {
        toast.error(res.error);
      }
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {members.length === 0 && (
        <Card className="border-primary/30 bg-primary/5 py-6 shadow-none">
          <CardContent className="flex flex-col gap-3 px-6 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Users className="size-6 text-primary" />
            </span>
            <div className="space-y-1">
              <p className="font-bold">سلام! به دنگ‌حساب خوش اومدی</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                ۱. اسم اعضای گروه رو اضافه کن
                <br />
                ۲. هزینه‌ها رو با مبلغ و پرداخت‌کننده ثبت کن
                <br />
                ۳. تب «تسویه حساب» می‌گه هر کی باید به کی چقدر بزنه
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <form onSubmit={handleAddMember}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="member-name">اسم عضو جدید</Label>
              <Input
                id="member-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً علی"
                maxLength={40}
              />
            </div>
            <Button type="submit" disabled={adding}>
              {adding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              {adding ? "در حال افزودن…" : "اضافه کن"}
            </Button>
          </CardContent>
        </form>
      </Card>

      {members.length > 0 && (
        <section aria-label="اعضای گروه" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">اعضای گروه</h2>
          </div>
          <div className="grid max-h-[60vh] gap-3 overflow-y-auto pe-1">
            {members.map((m) => {
              const b = balances.find((x) => x.memberId === m.id);
              const paid = b?.paid ?? 0;
              const owed = b?.owed ?? 0;
              const balance = b?.balance ?? 0;
              return (
                <Card key={m.id} className="gap-0 py-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-10 border">
                          <AvatarFallback className="bg-primary/10 font-bold text-primary">
                            {m.name.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{m.name}</p>
                          <p className="text-xs text-muted-foreground">
                            عضو از {formatJalaliDate(m.createdAt)}
                          </p>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            aria-label={`حذف ${m.name}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف عضو</AlertDialogTitle>
                            <AlertDialogDescription>
                              مطمئنی می‌خوای «{m.name}» رو حذف کنی؟
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              نه، دست نگه‌دار
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                const res = await removeMember(m.id);
                                if (res.ok) toast.success(`«${m.name}» حذف شد.`);
                                else toast.error(res.error);
                              }}
                              className="bg-destructive text-white hover:bg-destructive/90"
                            >
                              آره، حذفش کن
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          پرداخت کرده
                        </p>
                        <p className="mt-0.5 text-sm font-bold">
                          {formatMoney(paid)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          سهمش بوده
                        </p>
                        <p className="mt-0.5 text-sm font-bold">
                          {formatMoney(owed)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          وضعیت
                        </p>
                        <p
                          className={cn(
                            "mt-0.5 text-xs font-bold",
                            balance > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : balance < 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-muted-foreground"
                          )}
                        >
                          {balance === 0
                            ? "تسویه"
                            : balance > 0
                              ? `بستانکار ${formatMoney(balance)}`
                              : `بدهکار ${formatMoney(-balance)}`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <DatabaseBackup className="size-4 text-primary" />
            <p className="font-semibold">پشتیبان‌گیری و انتقال داده‌ها</p>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            اطلاعات روی سرور ذخیره می‌شن و از هر مرورگری قابل دسترسی‌ان. با
            پشتیبان‌گیری می‌تونی یه کپی امن ازشون داشته باشی یا روی نصب دیگه‌ای
            بازیابیشون کنی.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadBackup(members, expenses);
                toast.success("فایل پشتیبان ساخته شد.");
              }}
              disabled={!hasData}
            >
              <Download className="size-4" />
              گرفتن پشتیبان
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4" />
              بازیابی از فایل
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={!hasData}>
                  <Trash2 className="size-4" />
                  پاک کردن همه‌چیز
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>پاک کردن همه داده‌ها</AlertDialogTitle>
                  <AlertDialogDescription>
                    همه اعضا و هزینه‌ها برای همیشه از روی سرور پاک می‌شن.
                    قبلش یه فایل پشتیبان بگیر شاید پشیمون شدی!
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>نه، دست نگه‌دار</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      if (resetting) return;
                      setResetting(true);
                      try {
                        const res = await resetAll();
                        if (res.ok) toast.success("همه داده‌ها پاک شد.");
                        else toast.error(res.error);
                      } finally {
                        setResetting(false);
                      }
                    }}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {resetting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    آره، همه‌چیز پاک بشه
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleFile}
              aria-label="انتخاب فایل پشتیبان"
            />
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImport(null);
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>بازیابی از فایل پشتیبان</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingImport
                ? `این فایل ${formatMoney(
                    pendingImport.members.length
                  )} عضو و ${formatMoney(
                    pendingImport.expenses.length
                  )} هزینه داره. با بازیابی، همه داده‌های فعلی جایگزین می‌شن. ادامه بدم؟`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>
              نه، بی‌خیال
            </AlertDialogCancel>
            <AlertDialogAction onClick={applyImport} disabled={importing}>
              {importing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              آره، بازیابی کن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
