"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ActivityIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  DropletsIcon,
  Loader2Icon,
  LogOutIcon,
  RefreshCwIcon,
  WalletIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CatalogEscape } from "@/components/catalog-escape";
import { GatewayStrip } from "@/components/gateway-strip";
import { UsdcAmount } from "@/components/usdc-amount";
import { formatTime, truncateAddress } from "@/lib/format";
import { getNetwork } from "@/lib/networks";
import type { ActivityEntry, LogLevel, NetworkId, WalletInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEVEL_CLASS: Record<LogLevel, string> = {
  info: "text-muted-foreground",
  ok: "text-cyan",
  warn: "text-amber-300",
  error: "text-red-400",
  pay: "text-violet",
  search: "text-primary",
};

export function WalletPanel({
  demoMode,
  network,
  wallet,
  balanceUsdc,
  gatewayUsdc,
  connecting,
  funding,
  gatewayLoading,
  activity,
  onConnect,
  onFund,
  onLoadGateway,
  onRefresh,
  onDisconnect,
  onClearActivity,
  onDemo,
  onNetwork,
}: {
  demoMode: boolean;
  network: NetworkId;
  wallet: WalletInfo | null;
  email: string | null;
  balanceUsdc: number | null;
  gatewayUsdc: number | null;
  connecting: boolean;
  funding: boolean;
  gatewayLoading?: boolean;
  funded: boolean;
  activity: ActivityEntry[];
  onConnect: () => void;
  onFund: () => void;
  onLoadGateway: () => void;
  onRefresh: () => void;
  onDisconnect: () => void;
  onClearActivity: () => void;
  onDemo: () => void;
  onNetwork: (id: NetworkId) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const net = getNetwork(network);
  const connected = Boolean(wallet?.address);
  const displayBalance = connected ? (balanceUsdc ?? 0) : null;
  const empty = connected && (balanceUsdc ?? 0) <= 0;
  const entries = [...activity].reverse();

  async function copy() {
    if (!wallet?.address) return;
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-lg flex-col items-center gap-4",
        showActivity ? "min-h-0 flex-1" : "my-auto",
      )}
    >
      <div
        className={cn(
          "relative w-full shrink-0 overflow-hidden rounded-[1.4rem] p-5 shadow-[0_24px_60px_-28px_oklch(0.45_0.14_262/0.7)]",
          "bg-[linear-gradient(145deg,oklch(0.22_0.05_268)_0%,oklch(0.16_0.04_268)_48%,oklch(0.2_0.055_196)_140%)]",
          "ring-1 ring-white/10",
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 size-44 rounded-full bg-cyan/10 blur-3xl"
        />
        <div className="relative flex items-start justify-between">
          <span className="flex items-center gap-2 text-cyan">
            <WalletIcon className="size-5" />
            <span className="text-[11px] tracking-[0.22em] uppercase">Wallet</span>
          </span>
          <Image
            src="/usdc.svg"
            alt="USDC"
            width={24}
            height={24}
            className="size-6 shrink-0"
          />
        </div>

        <div
          aria-hidden
          className="mt-5 h-8 w-11 rounded-md bg-[linear-gradient(135deg,#d4b56a_0%,#f0e0a8_40%,#b8923a_100%)] opacity-90"
        />

        {!connected ? (
          <div className="relative mt-8 font-mono text-sm tracking-[0.28em] text-white/25">
            0x — — — —
          </div>
        ) : (
          <>
            <div className="relative mt-6 flex items-center gap-2 font-mono text-[13px] tracking-[0.18em] text-white/80">
              <span className="min-w-0 truncate">{truncateAddress(wallet!.address, 8, 6)}</span>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[10px] tracking-[0.12em] text-white/80 uppercase hover:border-cyan/40 hover:text-cyan"
              >
                {copied ? <CheckIcon className="size-3 text-cyan" /> : <CopyIcon className="size-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <a
                href={net.explorerAddress(wallet!.address)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-white/45 hover:text-cyan"
                aria-label="Explorer"
              >
                <ExternalLinkIcon className="size-3.5" />
              </a>
            </div>
            <div className="relative mt-5 flex items-end justify-between">
              <div>
                <UsdcAmount amount={displayBalance} digits={2} size="xl" muted={empty} />
                {empty ? (
                  <p className="mt-2 text-[11px] tracking-[0.14em] text-amber-200/80 uppercase">
                    {net.environment === "mainnet" ? "Empty · add USDC" : "Empty · get testnet USDC"}
                  </p>
                ) : null}
              </div>
              <div className="text-right text-[11px] tracking-[0.16em] text-white/40 uppercase">
                {net.shortLabel}
              </div>
            </div>
            <div className="relative mt-4 border-t border-white/8 pt-3">
              <GatewayStrip
                gatewayUsdc={gatewayUsdc}
                vanillaUsdc={balanceUsdc}
                loading={gatewayLoading}
                onLoad={onLoadGateway}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex w-full shrink-0 justify-center gap-2">
        {!connected ? (
          <Button onClick={onConnect} disabled={connecting} size="lg" className="cursor-pointer">
            {connecting ? <Loader2Icon className="animate-spin" /> : <WalletIcon />}
            Connect
          </Button>
        ) : (
          <>
            <Button
              onClick={onFund}
              disabled={funding}
              size="lg"
              className={cn(
                "cursor-pointer",
                empty && "min-w-[12.5rem] shadow-[0_0_28px_-6px_oklch(0.84_0.13_196/0.7)]",
              )}
            >
              {funding ? <Loader2Icon className="animate-spin" /> : <DropletsIcon />}
              {empty
                ? net.environment === "mainnet"
                  ? "Add USDC"
                  : "Get testnet USDC"
                : "Fund"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onRefresh}
              aria-label="Refresh"
              className="cursor-pointer"
            >
              <RefreshCwIcon />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onDisconnect}
              className="cursor-pointer"
            >
              <LogOutIcon />
              Disconnect
            </Button>
          </>
        )}
        <Button
          variant={showActivity ? "default" : "outline"}
          size="lg"
          className="cursor-pointer"
          onClick={() => setShowActivity((open) => !open)}
          aria-pressed={showActivity}
        >
          <ActivityIcon />
          Activity
        </Button>
      </div>

      {!demoMode && !net.marketplaceLive ? (
        <div className="glass w-full rounded-2xl p-4">
          <CatalogEscape compact network={network} onDemo={onDemo} onNetwork={onNetwork} />
        </div>
      ) : null}

      {showActivity ? (
        <div className="glass flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl">
          <div className="flex shrink-0 items-center justify-between px-4 pt-3">
            <span className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              Activity
            </span>
            <button
              type="button"
              onClick={onClearActivity}
              disabled={!entries.length}
              className="cursor-pointer text-[11px] tracking-wide text-muted-foreground uppercase hover:text-foreground disabled:opacity-40"
            >
              Clear
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-6">
            {entries.length === 0 ? (
              <div className="flex h-full min-h-24 items-center justify-center text-muted-foreground">
                —
              </div>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="flex gap-3 py-0.5">
                  <span className="shrink-0 text-muted-foreground/50">{formatTime(entry.ts)}</span>
                  <span className={cn("w-12 shrink-0 uppercase", LEVEL_CLASS[entry.level])}>
                    {entry.action}
                  </span>
                  <span className="min-w-0 break-words text-foreground/75">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
