"use client";

import { InfoIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UsdcAmount } from "@/components/usdc-amount";
import { GATEWAY_MIN_DEPOSIT, sizeEcoDeposit } from "@/lib/circle-chains";
import { gatewayNeedsLoad } from "@/lib/circle-gateway";
import { cn } from "@/lib/utils";

export const GATEWAY_TIP =
  "Circle Gateway is the nanopayment pool most Marketplace sellers charge — not the USDC sitting on this chain. Eco moves 0.50 USDC from this wallet onto Polygon (~30s, $0.03 fee). After that, Run settles in milliseconds. We never move your full balance.";

export function GatewayStrip({
  gatewayUsdc,
  vanillaUsdc,
  loading,
  compact,
  onLoad,
}: {
  gatewayUsdc: number | null;
  vanillaUsdc: number | null;
  loading?: boolean;
  compact?: boolean;
  onLoad: () => void;
}) {
  const empty = gatewayNeedsLoad(gatewayUsdc);
  const canLoad = sizeEcoDeposit(vanillaUsdc ?? 0, 0) != null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        compact ? "rounded-xl border border-white/8 bg-white/3 px-3 py-2" : "",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] tracking-[0.16em] text-white/45 uppercase">
            Gateway
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex size-4 items-center justify-center rounded-full text-white/40 hover:text-cyan"
                aria-label="What is Gateway"
              >
                <InfoIcon className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[18rem] text-left leading-relaxed">
              {GATEWAY_TIP}
            </TooltipContent>
          </Tooltip>
        </div>
        <UsdcAmount
          amount={gatewayUsdc ?? 0}
          digits={2}
          size={compact ? "sm" : "md"}
          muted={empty}
        />
      </div>
      {empty ? (
        <Button
          size={compact ? "sm" : "default"}
          variant={compact ? "default" : "outline"}
          disabled={loading || !canLoad}
          onClick={onLoad}
          className="cursor-pointer shrink-0"
        >
          {loading ? <Loader2Icon className="animate-spin" /> : null}
          {loading ? "Loading…" : `Load ${GATEWAY_MIN_DEPOSIT.toFixed(2)}`}
        </Button>
      ) : null}
    </div>
  );
}
