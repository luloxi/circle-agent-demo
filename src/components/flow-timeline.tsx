"use client";

import {
  CheckIcon,
  CircleDashedIcon,
  Loader2Icon,
  PlayIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CatalogEscape } from "@/components/catalog-escape";
import { GatewayStrip } from "@/components/gateway-strip";
import { UsdcAmount } from "@/components/usdc-amount";
import { gatewayNeedsLoad } from "@/lib/circle-gateway";
import { serviceName } from "@/lib/format";
import { qualityLabel } from "@/lib/composer";
import type { FlowStep, NetworkId, QualityTier, QueryPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_ICON = {
  pending: CircleDashedIcon,
  running: Loader2Icon,
  completed: CheckIcon,
  error: XIcon,
  skipped: CircleDashedIcon,
};

export function FlowTimeline({
  plan,
  executing,
  network,
  onExecute,
  onRemove,
  onAlternative,
  onDemo,
  onNetwork,
  gatewayUsdc,
  vanillaUsdc,
  gatewayLoading,
  onLoadGateway,
}: {
  plan: QueryPlan;
  executing: boolean;
  network?: NetworkId;
  onExecute: () => void;
  onRemove: (stepId: string) => void;
  onAlternative: (stepId: string, quality: QualityTier) => void;
  onDemo?: () => void;
  onNetwork?: (id: NetworkId) => void;
  gatewayUsdc?: number | null;
  vanillaUsdc?: number | null;
  gatewayLoading?: boolean;
  onLoadGateway?: () => void;
}) {
  const showGateway = Boolean(onLoadGateway) && gatewayNeedsLoad(gatewayUsdc);
  return (
    <div className="glass flex h-full min-h-0 flex-col rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
        <h2 className="font-heading text-lg tracking-tight">{plan.title}</h2>
        <UsdcAmount amount={plan.estimatedTotal} size="lg" />
      </div>

      {plan.steps.length === 0 && (plan.note || (onDemo && onNetwork && network)) ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          {onDemo && onNetwork && network ? (
            <CatalogEscape
              network={network}
              onDemo={onDemo}
              onNetwork={onNetwork}
              note={plan.note}
              allowLiveEmpty
            />
          ) : plan.note ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{plan.note}</p>
          ) : null}
        </div>
      ) : (
      <ol className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto md:flex-row md:items-stretch">
        {plan.steps.map((step, index) => (
          <StepRow
            key={step.id}
            step={step}
            last={index === plan.steps.length - 1}
            locked={executing}
            onRemove={() => onRemove(step.id)}
            onAlternative={(q) => onAlternative(step.id, q)}
          />
        ))}
      </ol>
      )}

      {plan.steps.length > 0 && showGateway && onLoadGateway ? (
        <div className="mt-3 shrink-0">
          <GatewayStrip
            compact
            gatewayUsdc={gatewayUsdc ?? 0}
            vanillaUsdc={vanillaUsdc ?? 0}
            loading={gatewayLoading}
            onLoad={onLoadGateway}
          />
        </div>
      ) : null}

      {plan.steps.length > 0 ? (
        <Button
          size="lg"
          className="mt-3 w-full shrink-0"
          onClick={onExecute}
          disabled={executing || gatewayLoading}
        >
          {executing ? <Loader2Icon className="animate-spin" /> : <PlayIcon />}
          {executing ? "Running" : "Execute"}
        </Button>
      ) : null}
    </div>
  );
}

function StepRow({
  step,
  last,
  locked,
  onRemove,
  onAlternative,
}: {
  step: FlowStep;
  last: boolean;
  locked: boolean;
  onRemove: () => void;
  onAlternative: (quality: QualityTier) => void;
}) {
  const Icon = STATUS_ICON[step.status];
  return (
    <li
      className={cn(
        "relative flex min-w-0 flex-1 gap-3 rounded-xl bg-white/3 p-3",
        "md:min-w-[10.5rem] md:flex-col",
      )}
    >
      {!last ? (
        <span
          aria-hidden
          className="absolute top-7 right-0 hidden h-px w-3 translate-x-full bg-white/10 md:block"
        />
      ) : null}
      <span
        className={cn(
          "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
          step.status === "completed" && "border-transparent bg-violet text-[#140814] glow-violet",
          step.status === "running" && "animate-pulse-soft border-cyan/50 bg-cyan/15 text-cyan",
          step.status === "error" && "border-destructive/40 bg-destructive/15 text-destructive",
          step.status === "pending" && "border-white/10 bg-[#0b1020] text-muted-foreground",
        )}
      >
        <Icon className={cn("size-3.5", step.status === "running" && "animate-spin")} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 md:flex-col md:items-start">
          <div className="truncate text-sm font-medium">{step.title}</div>
          <UsdcAmount amount={step.paidUsdc ?? step.priceUsdc} size="sm" />
        </div>
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {serviceName(step.listing)}
        </div>
        {step.excerpt ? (
          <p className="mt-2 line-clamp-2 text-xs text-foreground/75">{step.excerpt}</p>
        ) : null}
        {step.error ? <p className="mt-2 text-xs text-destructive">{step.error}</p> : null}

        {!locked && step.status === "pending" ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {step.alternatives.map((alt) => (
              <button
                key={alt.listing.resource}
                type="button"
                onClick={() => onAlternative(alt.quality)}
                className="rounded-full border border-white/8 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-cyan/30 hover:text-cyan"
              >
                <span className="inline-flex items-center gap-1">
                  {qualityLabel(alt.quality)} ·
                  <UsdcAmount amount={alt.priceUsdc} size="xs" />
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              aria-label="Remove"
            >
              <Trash2Icon className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
