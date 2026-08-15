"use client";

import Image from "next/image";
import { formatUsdPrice, formatUsdc } from "@/lib/format";
import { cn } from "@/lib/utils";

const SIZE = {
  xs: { px: 12, icon: "size-3", text: "text-[10px]", gap: "gap-0.5" },
  sm: { px: 14, icon: "size-3.5", text: "text-sm", gap: "gap-1" },
  md: { px: 16, icon: "size-4", text: "text-base", gap: "gap-1.5" },
  lg: { px: 20, icon: "size-5", text: "text-xl", gap: "gap-1.5" },
  xl: { px: 28, icon: "size-7", text: "text-4xl leading-none", gap: "gap-2" },
} as const;

export function UsdcAmount({
  amount,
  size = "sm",
  digits,
  className,
  muted,
}: {
  amount: number | null | undefined;
  size?: keyof typeof SIZE;
  digits?: number;
  className?: string;
  muted?: boolean;
}) {
  const spec = SIZE[size];
  const label = digits != null ? formatUsdc(amount, digits) : formatUsdPrice(amount);
  if (label === "—") {
    return <span className={cn("price", spec.text, className)}>—</span>;
  }
  return (
    <span
      className={cn(
        "price inline-flex items-center",
        spec.gap,
        spec.text,
        muted && "text-white/45",
        className,
      )}
    >
      <Image
        src="/usdc.svg"
        alt=""
        width={spec.px}
        height={spec.px}
        className={cn(spec.icon, "shrink-0")}
      />
      {label}
    </span>
  );
}
