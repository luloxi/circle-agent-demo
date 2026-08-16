"use client";

import {
  CheckIcon,
  CircleDollarSignIcon,
  PlayIcon,
  SparkleIcon,
  WalletIcon,
  WandSparklesIcon,
} from "lucide-react";
import { SparkleBurst } from "@/components/sparkle-burst";
import { cn } from "@/lib/utils";

export const STAGES = [
  { id: 1, label: "Wallet", icon: WalletIcon },
  { id: 2, label: "Query", icon: WandSparklesIcon },
  { id: 3, label: "Cost", icon: CircleDollarSignIcon },
  { id: 4, label: "Run", icon: PlayIcon },
  { id: 5, label: "Done", icon: SparkleIcon },
] as const;

export type StageId = (typeof STAGES)[number]["id"];

export function FlowStepper({
  current,
  view,
  onView,
  burstStep,
  burstKey,
  unlocked,
}: {
  current: number;
  view: StageId;
  onView: (id: StageId) => void;
  burstStep: number | null;
  burstKey: number;
  unlocked: StageId;
}) {
  return (
    <ol className="relative grid shrink-0 grid-cols-5 gap-0 px-1 sm:px-0">
      <span
        aria-hidden
        className="absolute top-[1.125rem] right-[8%] left-[8%] h-px bg-white/8 sm:top-5"
      />
      <span
        aria-hidden
        className="absolute top-[1.125rem] left-[8%] h-px bg-gradient-to-r from-cyan/80 via-violet/70 to-cyan/40 transition-[width] duration-700 ease-out sm:top-5"
        style={{
          width: `${Math.max(0, Math.min(1, (current - 1) / 4)) * 84}%`,
        }}
      />
      {STAGES.map((stage) => {
        const done = current > stage.id;
        const open = stage.id <= unlocked;
        const active = view === stage.id;
        const Icon = stage.icon;
        return (
          <li key={stage.id} className="relative flex flex-col items-center">
            <button
              type="button"
              onClick={() => open && onView(stage.id)}
              className={cn(
                "relative flex min-h-12 cursor-pointer flex-col items-center gap-1.5 touch-manipulation sm:min-h-0 sm:gap-1.5",
                !open && "opacity-40",
              )}
              aria-disabled={!open}
              aria-current={active ? "step" : undefined}
              aria-label={stage.label}
            >
              <span
                className={cn(
                  "relative flex size-9 items-center justify-center rounded-full border transition-all duration-300 sm:size-9",
                  done && "border-transparent bg-cyan text-[#071018]",
                  !done &&
                    active &&
                    "border-cyan/60 bg-cyan/15 text-cyan shadow-[0_0_0_6px_oklch(0.84_0.13_196/0.14)]",
                  !done &&
                    !active &&
                    open &&
                    "border-cyan/25 bg-[#0b1020] text-cyan/80 hover:border-cyan/50 active:scale-95",
                  !open && "border-white/10 bg-[#0b1020] text-muted-foreground",
                )}
              >
                {done ? <CheckIcon className="size-4" /> : <Icon className="size-4" />}
                <SparkleBurst
                  active={burstStep === stage.id}
                  burstKey={burstKey}
                />
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium tracking-wide uppercase sm:text-[10px] sm:tracking-[0.14em]",
                  active || done ? "text-foreground/90" : "text-muted-foreground/70",
                )}
              >
                {stage.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
