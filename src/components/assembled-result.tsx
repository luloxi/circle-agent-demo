"use client";

import { UsdcAmount } from "@/components/usdc-amount";
import type { QueryPlan } from "@/lib/types";

export function AssembledResult({ plan }: { plan: QueryPlan }) {
  const result = plan.assembled;
  if (!result) return null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-violet/30 bg-[color-mix(in_oklch,var(--card)_86%,oklch(0.4_0.14_318)_8%)] shadow-[inset_0_0_48px_-18px_oklch(0.74_0.16_318/0.45)]">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-heading max-w-xl text-xl tracking-tight sm:text-2xl">
            {result.headline}
          </h2>
          <UsdcAmount amount={plan.spentTotal} size="lg" className="shrink-0" />
        </div>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-foreground/80">
          {result.summary}
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {result.sections.map((section) => (
            <section key={section.heading} className="space-y-2">
              <h3 className="text-[11px] tracking-[0.16em] text-cyan uppercase">
                {section.heading}
              </h3>
              <p className="text-sm text-muted-foreground">{section.body}</p>
              {section.bullets?.length ? (
                <ul className="space-y-1.5 text-sm">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-violet" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
