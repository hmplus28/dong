"use client";

import { Input } from "@/components/ui/input";
import { formatMoney, parseAmount } from "@/lib/dang/format";

interface MoneyInputProps
  extends Omit<
    React.ComponentProps<typeof Input>,
    "value" | "onChange" | "type"
  > {
  value: number | null;
  onValueChange: (value: number | null) => void;
}

/** ورودی مبلغ تومانی: ارقام فارسی/انگلیسی رو می‌فهمه و با جداکننده نشون می‌ده */
export function MoneyInput({
  value,
  onValueChange,
  ...props
}: MoneyInputProps) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={value === null ? "" : formatMoney(value)}
      onChange={(e) => onValueChange(parseAmount(e.target.value))}
      {...props}
    />
  );
}
