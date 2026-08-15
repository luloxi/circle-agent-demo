"use client";

import {
  ChartNoAxesCombinedIcon,
  Loader2Icon,
  MessagesSquareIcon,
  PlayIcon,
  SearchIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UsdcAmount } from "@/components/usdc-amount";
import type { PresetCard } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof TrendingUpIcon> = {
  prices: TrendingUpIcon,
  search: SearchIcon,
  social: MessagesSquareIcon,
  odds: ChartNoAxesCombinedIcon,
};

export function PresetGallery({
  presets,
  busyId,
  onRun,
  onLoad,
}: {
  presets: PresetCard[];
  busyId: string | null;
  onRun: (id: string) => void;
  onLoad: (id: string) => void;
}) {
  return (
    <section className="relative z-20 grid shrink-0 grid-cols-2 gap-2 overflow-visible pt-1 md:grid-cols-4">
      {presets.map((preset, i) => {
        const Icon = ICONS[preset.id] ?? SearchIcon;
        const busy = busyId === preset.id;
        return (
          <article
            key={preset.id}
            className={cn(
              "glass group relative z-0 flex min-h-[4.5rem] items-center gap-2.5 overflow-hidden rounded-2xl px-2.5 py-2.5 transition-all duration-300 sm:min-h-16 sm:gap-3 sm:px-3",
              "hover:z-30 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_oklch(0.84_0.13_196/0.22),0_20px_40px_-24px_oklch(0.68_0.17_262/0.7)]",
            )}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <button
              type="button"
              onClick={() => onLoad(preset.id)}
              disabled={Boolean(busyId)}
              className="absolute inset-0 z-0"
              aria-label={`${preset.title}. ${preset.tagline}`}
            />
            <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/4 text-cyan sm:size-9">
              <Icon className="size-4" />
            </span>
            <div className="relative z-10 min-w-0 flex-1">
              <h3 className="truncate text-[13px] font-medium tracking-tight sm:text-sm">
                {preset.title}
              </h3>
              <p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground sm:hidden">
                {preset.tagline}
              </p>
              <UsdcAmount amount={preset.estimatedUsdc} size="sm" />
            </div>
            <Button
              size="icon"
              className="relative z-10 size-9 shrink-0 rounded-full sm:size-8"
              onClick={(e) => {
                e.stopPropagation();
                onRun(preset.id);
              }}
              disabled={Boolean(busyId)}
              aria-label={`Plan ${preset.title}`}
            >
              {busy ? <Loader2Icon className="animate-spin" /> : <PlayIcon className="size-3.5" />}
            </Button>
          </article>
        );
      })}
    </section>
  );
}
