"use client";

import { Loader2Icon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeBlock } from "@/components/code-block";
import {
  cheapestAcceptance,
  formatUsdPrice,
  serviceName,
  usdcFromAcceptance,
} from "@/lib/format";
import type { PayResult, ServiceListing } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PaymentPanel({
  service,
  maxAmount,
  onMaxAmount,
  paying,
  result,
  error,
  paid,
  connected,
  onPay,
}: {
  service: ServiceListing | null;
  maxAmount: string;
  onMaxAmount: (value: string) => void;
  paying: boolean;
  result: PayResult | null;
  error: string | null;
  paid: boolean;
  connected: boolean;
  onPay: () => void;
}) {
  const listedPrice = service
    ? usdcFromAcceptance(cheapestAcceptance(service))
    : null;

  return (
    <div className={cn("glass rounded-2xl p-6", paid && "glow-violet")}>
      <div className="flex items-end justify-between">
        <div className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
          Pay
        </div>
        {listedPrice != null ? (
          <span className="price text-3xl">{formatUsdPrice(listedPrice)}</span>
        ) : null}
      </div>

      <div className="mt-6 space-y-4">
        <Input
          id="service-url"
          readOnly
          value={service ? serviceName(service) : ""}
          placeholder="Pick a service"
          className="border-white/8 bg-white/4"
        />
        <Input
          id="max-amount"
          inputMode="decimal"
          value={maxAmount}
          onChange={(e) => onMaxAmount(e.target.value)}
          className="font-mono border-white/8 bg-white/4"
        />
        <Button
          size="lg"
          className="w-full"
          onClick={onPay}
          disabled={paying || !service || !connected}
        >
          {paying ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          {paying ? "Settling" : "Pay"}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {result?.ok ? <CodeBlock value={result.response} /> : null}
      </div>
    </div>
  );
}
