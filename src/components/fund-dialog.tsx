"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getNetwork } from "@/lib/networks";
import type { NetworkId } from "@/lib/types";

export function FundDialog({
  open,
  onOpenChange,
  network,
  address,
  message,
  commands,
  faucetUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  network: NetworkId;
  address: string | null;
  message: string;
  commands: string[];
  faucetUrl?: string;
}) {
  const net = getNetwork(network);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Get testnet USDC</DialogTitle>
          <DialogDescription>
            Paste this address on the Circle faucet, pick Arc Testnet, then
            refresh the wallet. Mainnet stays instructions-only.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>{message}</p>
          {address ? (
            <p className="font-mono text-xs break-all text-muted-foreground">{address}</p>
          ) : null}
          {commands.length > 0 ? (
            <pre className="overflow-auto rounded-lg bg-black/40 p-3 font-mono text-[11px] leading-6">
              {commands.join("\n")}
            </pre>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Official faucet:{" "}
            <a
              className="underline"
              href={faucetUrl ?? net.faucetUrl}
              target="_blank"
              rel="noreferrer"
            >
              {net.faucetLabel}
            </a>
          </p>
        </div>
        <DialogFooter showCloseButton>
          <Button asChild>
            <a href={faucetUrl ?? net.faucetUrl} target="_blank" rel="noreferrer">
              Open Circle faucet
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
