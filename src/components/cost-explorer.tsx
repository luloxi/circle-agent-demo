"use client";

import { Input } from "@/components/ui/input";
import { UsdcAmount } from "@/components/usdc-amount";
import type { QueryHistoryItem, QueryPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CostExplorer({
  plan,
  spendLimit,
  onSpendLimit,
  sessionSpent,
  history,
  onReplay,
}: {
  plan: QueryPlan | null;
  spendLimit: number;
  onSpendLimit: (value: number) => void;
  sessionSpent: number;
  history: QueryHistoryItem[];
  onReplay: (item: QueryHistoryItem) => void;
}) {
  const quoted = plan?.estimatedTotal ?? 0;
  const charged = plan?.spentTotal ?? 0;
  const started = Boolean(
    plan?.steps.some((step) => step.status === "completed" || step.status === "error"),
  );
  const over = quoted > spendLimit || sessionSpent + quoted > spendLimit;

  return (
    <div className="glass flex min-h-0 flex-col overflow-auto rounded-2xl p-4 md:h-full sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
            {started ? "Charged this run" : "Plan quote"}
          </p>
          <UsdcAmount
            amount={started ? charged : quoted}
            size="xl"
            className={cn("mt-1", over ? "text-amber-300" : undefined)}
          />
          {started ? (
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              Quoted <UsdcAmount amount={quoted} size="xs" className="align-middle" /> before
              Execute. Failed hops are not added here.
            </p>
          ) : (
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              What the hops cost if Execute succeeds. Nothing is charged until you run.
            </p>
          )}
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          Cap
          <Input
            id="spend-limit"
            inputMode="decimal"
            className="h-7 w-16 border-white/8 bg-white/4 px-2 font-mono text-xs"
            value={String(spendLimit)}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n >= 0) onSpendLimit(n);
            }}
          />
        </label>
      </div>

      <div className="mt-5 flex-1">
        {plan && plan.steps.length > 0 ? (
          <ul className="divide-y divide-white/6">
            {plan.steps.map((step) => (
              <li key={step.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  <StatusDot status={step.status} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{step.title}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {stepLabel(step.status)}
                    </span>
                  </span>
                </span>
                <StepAmount
                  quoted={step.priceUsdc}
                  charged={step.paidUsdc}
                  status={step.status}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-white/8 py-10 text-center text-sm text-muted-foreground">
            No hops yet
          </div>
        )}
      </div>

      <div className="mt-5 space-y-1 border-t border-white/6 pt-4 text-[11px] text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span>Session charged</span>
          <UsdcAmount amount={sessionSpent} digits={3} size="xs" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Session cap</span>
          <span className={over ? "text-amber-300" : "text-cyan/80"}>
            <UsdcAmount amount={spendLimit} digits={2} size="xs" />
            {over ? " · over" : ""}
          </span>
        </div>
      </div>

      {history.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-white/6 pt-3">
          {history.map((item) => (
            <li key={`${item.id}-${item.ts}`}>
              <button
                type="button"
                onClick={() => onReplay(item)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="min-w-0 truncate">{item.title}</span>
                {item.ok ? (
                  <UsdcAmount amount={item.spentUsdc} size="xs" />
                ) : (
                  <span className="text-destructive">Failed</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function stepLabel(status: string): string {
  if (status === "completed") return "Charged";
  if (status === "error") return "Failed · not added";
  if (status === "running") return "Paying…";
  if (status === "skipped") return "Skipped";
  return "Quote";
}

function StepAmount({
  quoted,
  charged,
  status,
}: {
  quoted: number;
  charged?: number;
  status: string;
}) {
  if (status === "completed") {
    return <UsdcAmount amount={charged ?? quoted} size="sm" />;
  }
  if (status === "error") {
    return (
      <span className="text-right">
        <UsdcAmount amount={quoted} size="sm" muted />
      </span>
    );
  }
  return <UsdcAmount amount={quoted} size="sm" muted={status !== "running"} />;
}

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        status === "completed" && "bg-violet",
        status === "running" && "bg-cyan",
        status === "error" && "bg-red-400",
        (status === "pending" || status === "skipped") && "bg-muted-foreground/40",
      )}
    />
  );
}
