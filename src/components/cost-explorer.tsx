"use client";

import { Input } from "@/components/ui/input";
import { formatUsdPrice, formatUsdc } from "@/lib/format";
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
  const estimated = plan?.estimatedTotal ?? 0;
  const shown = plan?.spentTotal || estimated;
  const over = estimated > spendLimit;

  return (
    <div className="glass flex h-full min-h-0 flex-col overflow-auto rounded-2xl p-4 sm:p-5">
      <div className="flex items-end justify-between">
        <span className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
          Total
        </span>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
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

      <div
        className={cn(
          "mt-1 font-mono text-4xl leading-none tracking-tight",
          over ? "text-amber-300" : "text-cyan",
        )}
      >
        {formatUsdPrice(shown)}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">USDC</div>

      <div className="mt-6 flex-1">
        {plan && plan.steps.length > 0 ? (
          <ul className="divide-y divide-white/6">
            {plan.steps.map((step) => (
              <li key={step.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  <StatusDot status={step.status} />
                  <span className="truncate text-sm">{step.title}</span>
                </span>
                <span className="price text-sm">
                  {formatUsdPrice(step.paidUsdc ?? step.priceUsdc)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-white/8 py-10 text-center text-sm text-muted-foreground">
            —
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Session {formatUsdc(sessionSpent, 3)}</span>
        <span className={over ? "text-amber-300" : "text-cyan/80"}>
          {over ? "Over cap" : "In cap"}
        </span>
      </div>

      {history.length > 0 ? (
        <ul className="mt-4 space-y-1 border-t border-white/6 pt-4">
          {history.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onReplay(item)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="min-w-0 truncate">{item.title}</span>
                <span className={cn("font-mono", item.ok ? "text-cyan" : "text-destructive")}>
                  {formatUsdPrice(item.spentUsdc)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
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
