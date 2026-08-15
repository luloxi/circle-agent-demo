"use client";

import { cn } from "@/lib/utils";

const SPARKS = [
  { x: 18, y: -22, delay: "0ms", size: 3 },
  { x: -16, y: -20, delay: "40ms", size: 2 },
  { x: 24, y: 6, delay: "70ms", size: 2 },
  { x: -22, y: 8, delay: "20ms", size: 3 },
  { x: 8, y: 22, delay: "90ms", size: 2 },
  { x: -6, y: -28, delay: "50ms", size: 2 },
  { x: 14, y: 16, delay: "110ms", size: 1.5 },
  { x: -14, y: 18, delay: "30ms", size: 1.5 },
];

export function SparkleBurst({
  active,
  burstKey,
  className,
}: {
  active: boolean;
  burstKey: number;
  className?: string;
}) {
  if (!active) return null;
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      {SPARKS.map((spark, i) => (
        <span
          key={`${burstKey}-${i}`}
          className="sparkle-dot absolute top-1/2 left-1/2"
          style={{
            width: spark.size,
            height: spark.size,
            animationDelay: spark.delay,
            ["--sx" as string]: `${spark.x}px`,
            ["--sy" as string]: `${spark.y}px`,
          }}
        />
      ))}
    </span>
  );
}
