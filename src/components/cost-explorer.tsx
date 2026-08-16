"use client";

import { HistoryIcon } from "lucide-react";
import { UsdcAmount } from "@/components/usdc-amount";
import { formatTime } from "@/lib/format";
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
  plan: QueryPlan;
  spendLimit: number;
  onSpendLimit: (value: number) => void;
  sessionSpent: number;
  history: QueryHistoryItem[];
  onReplay: (item: QueryHistoryItem) => void;
}) {
  const overCap = plan.estimatedTotal > spendLimit;

  return (
    <div className="glass flex min-h-0 flex-col overflow-auto rounded-2xl p-3.5 md:h-full sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.16em] text-cyan uppercase">Plan quote</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <UsdcAmount amount={plan.estimatedTotal} digits={3} size="lg" />
            <span className="text-[11px] text-muted-foreground">est.</span>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            What the hops cost if Execute succeeds. Nothing is charged until you run.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          Cap
          <input
            type="number"
            min={0.05}
            step={0.05}
            value={spendLimit}
            onChange={(e) => onSpendLimit(Number(e.target.value) || 0)}
            className="h-8 w-16 rounded-lg border border-white/10 bg-white/5 px-2 text-right font-mono text-sm text-foreground outline-none focus:border-cyan/40"
          />
        </label>
      </div>

      <div className="mt-5 flex-1">
        {plan.steps.length ? (
          <ul className="divide-y divide-white/6">
            {plan.steps.map((step) => (
              <li key={step.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      step.status === "completed"
                        ? "bg-cyan"
                        : step.status === "running"
                          ? "animate-pulse bg-violet"
                          : step.status === "error"
                            ? "bg-red-400"
                            : "bg-white/25",
                    )}
                  />
                  <span className="truncate text-[13px]">{step.title}</span>
                </span>
                <UsdcAmount amount={step.paidUsdc ?? step.priceUsdc} digits={3} size="sm" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-white/8 py-10 text-center text-sm text-muted-foreground">
            No steps yet
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2 border-t border-white/8 pt-3 text-[12px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Session charged</span>
          <UsdcAmount amount={sessionSpent} digits={3} size="sm" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Session cap</span>
          <UsdcAmount amount={spendLimit} digits={2} size="sm" />
        </div>
        {overCap ? (
          <p className="text-[11px] text-amber-200/90">
            Plan exceeds the session cap. Raise Cap or remove a step.
          </p>
        ) : null}
      </div>

      {history.length > 0 ? (
        <div className="mt-4 border-t border-white/8 pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            <HistoryIcon className="size-3" />
            Recent
          </p>
          <ul className="space-y-1">
            {history.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onReplay(item)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className="min-w-0 truncate">{item.title}</span>
                  <span className="shrink-0 font-mono">
                    {item.spentUsdc.toFixed(3)} · {formatTime(item.ts)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
