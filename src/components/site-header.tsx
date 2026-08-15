"use client";

import Image from "next/image";
import Link from "next/link";
import { SparkleIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NETWORK_LIST, type AppMode } from "@/lib/networks";
import { UsdcAmount } from "@/components/usdc-amount";
import { truncateAddress } from "@/lib/format";
import type { NetworkId } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SiteHeader({
  demoMode,
  network,
  onMode,
  address,
  connected,
  balanceUsdc,
  onWallet,
  variant = "app",
}: {
  demoMode?: boolean;
  onDemoMode?: (value: boolean) => void;
  network?: NetworkId;
  onNetwork?: (value: NetworkId) => void;
  onMode?: (value: AppMode) => void;
  address?: string | null;
  connected?: boolean;
  balanceUsdc?: number | null;
  onWallet?: () => void;
  variant?: "app" | "doc";
}) {
  const mode: AppMode = demoMode || !network ? "demo" : network;
  return (
    <header className="z-40 shrink-0 border-b border-white/5 bg-[#070b16]/70 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <Image src="/logo.svg" alt="" width={30} height={30} className="rounded-[9px]" />
            <span className="font-heading text-[15px] tracking-tight">AQC</span>
          </Link>
          <Link
            href="/faq"
            className={cn(
              "mx-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] tracking-[0.18em] uppercase transition-all",
              variant === "doc"
                ? "border border-cyan/45 bg-cyan/15 text-cyan shadow-[0_0_22px_-6px_oklch(0.84_0.13_196/0.7)]"
                : "border border-cyan/25 bg-cyan/[0.07] text-cyan/90 shadow-[inset_0_1px_0_oklch(1_0_0/0.08),0_0_18px_-8px_oklch(0.84_0.13_196/0.55)] hover:border-cyan/45 hover:bg-cyan/12 hover:text-cyan hover:shadow-[0_0_26px_-6px_oklch(0.84_0.13_196/0.65)]",
            )}
          >
            <SparkleIcon className="size-3" />
            FAQ
          </Link>
          {variant === "doc" ? (
            <Link
              href="/"
              className="shrink-0 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 text-[11px] tracking-[0.14em] text-cyan uppercase"
            >
              Composer
            </Link>
          ) : (
            <Select value={mode} onValueChange={(v) => onMode?.(v as AppMode)}>
              <SelectTrigger size="sm" className="min-w-[8.5rem] shrink-0 border-white/8 bg-white/4">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="demo">Demo</SelectItem>
                {NETWORK_LIST.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.shortLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {variant === "app" ? (
        <div className="ml-2 flex shrink-0 items-center gap-2 sm:ml-2.5 sm:gap-2.5">
          {connected ? (
            <UsdcAmount
              amount={balanceUsdc}
              digits={3}
              size="sm"
              className="hidden sm:inline-flex"
            />
          ) : null}

          <button
            type="button"
            onClick={onWallet}
            className={cn(
              "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] sm:inline-flex",
              connected
                ? "border-cyan/30 bg-cyan/10 text-cyan hover:border-cyan/55"
                : "border-white/8 text-muted-foreground hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                connected ? "animate-pulse-soft bg-cyan" : "bg-muted-foreground/50",
              )}
            />
            {connected && address ? truncateAddress(address) : "Off"}
          </button>
        </div>
        ) : null}
      </div>
    </header>
  );
}
