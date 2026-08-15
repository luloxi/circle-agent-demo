"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UsdcAmount } from "@/components/usdc-amount";
import { getNetwork, usdcTransferUri } from "@/lib/networks";
import type { NetworkId } from "@/lib/types";

export function FundDialog({
  open,
  onOpenChange,
  network,
  address,
  message,
  faucetUrl,
  balanceUsdc,
  watching,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  network: NetworkId;
  address: string | null;
  message: string;
  commands: string[];
  faucetUrl?: string;
  balanceUsdc?: number | null;
  watching?: boolean;
}) {
  const net = getNetwork(network);
  const mainnet = net.environment === "mainnet";
  const [copied, setCopied] = useState(false);
  const arrived = (balanceUsdc ?? 0) > 0;
  const qrPayload = address ? (mainnet ? usdcTransferUri(net, address) : address) : "";
  const qrSrc = qrPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&qzone=2&bgcolor=070b16&color=5ee7d3&data=${encodeURIComponent(qrPayload)}`
    : "";

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mainnet ? "Add USDC" : "Get testnet USDC"}</DialogTitle>
          <DialogDescription>
            {mainnet
              ? `Send USDC on ${net.shortLabel}.`
              : `Copy the address, then open the Circle faucet and pick ${net.shortLabel}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {mainnet && qrSrc ? (
            <div className="flex justify-center">
              <div className="rounded-2xl bg-[#070b16] p-3 ring-1 ring-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrSrc} alt="USDC deposit QR" width={200} height={200} className="size-[200px]" />
              </div>
            </div>
          ) : null}

          {address ? (
            <div className="space-y-2">
              <p className="break-all rounded-xl bg-black/40 px-3 py-2.5 font-mono text-[12px] leading-6 text-foreground/90">
                {address}
              </p>
              <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                {mainnet ? `USDC · ${net.shortLabel}` : net.shortLabel}
              </p>
              <Button
                className="h-12 w-full"
                size="lg"
                variant="outline"
                onClick={() => void copyAddress()}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Copied" : "Copy address"}
              </Button>
            </div>
          ) : null}

          {!mainnet ? (
            <Button asChild className="h-14 w-full text-base" size="lg">
              <a href={faucetUrl ?? net.faucetUrl} target="_blank" rel="noreferrer">
                <ExternalLinkIcon />
                Open Circle faucet
              </a>
            </Button>
          ) : null}

          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 px-3 py-2.5">
            <span className="flex items-center gap-2">
              {watching ? <Loader2Icon className="size-3.5 animate-spin text-cyan" /> : null}
              <UsdcAmount amount={balanceUsdc ?? 0} digits={2} size="md" muted={!arrived} />
            </span>
          </div>
          {watching && !arrived ? (
            <p className="text-xs text-muted-foreground">Watching {net.shortLabel}…</p>
          ) : null}
          {arrived ? (
            <p className="text-xs text-cyan">USDC arrived. You can run a query.</p>
          ) : null}

          {message && !mainnet ? (
            <p className="text-xs text-muted-foreground">{message}</p>
          ) : null}

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="mx-auto block pt-1 text-[11px] tracking-[0.14em] text-muted-foreground/70 uppercase hover:text-muted-foreground"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
