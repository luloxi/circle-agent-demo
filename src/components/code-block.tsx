"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prettyJson } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CodeBlock({
  value,
  className,
  maxHeight = "max-h-80",
}: {
  value: unknown;
  className?: string;
  maxHeight?: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = typeof value === "string" ? value : prettyJson(value);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-black/40",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-[11px] tracking-wide text-muted-foreground">
          response.json
        </span>
        <Button variant="ghost" size="xs" onClick={copy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre
        className={cn(
          "overflow-auto p-3 font-mono text-[12px] leading-relaxed text-primary/90",
          maxHeight,
        )}
      >
        {text}
      </pre>
    </div>
  );
}
