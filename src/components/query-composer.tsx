"use client";

import { Loader2Icon, SparkleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function QueryComposer({
  prompt,
  onPrompt,
  decomposing,
  onDecompose,
}: {
  prompt: string;
  onPrompt: (value: string) => void;
  decomposing: boolean;
  onDecompose: () => void;
}) {
  return (
    <div className="glass glow-line flex min-h-[14rem] flex-col gap-2 rounded-2xl p-3 md:h-full md:min-h-0">
      <div className="shrink-0 px-1 pt-1 sm:px-3">
        <p className="text-[11px] tracking-[0.16em] text-cyan uppercase">Custom query</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Type your own ask. We turn it into priced Marketplace steps.
        </p>
      </div>
      <Textarea
        value={prompt}
        onChange={(e) => onPrompt(e.target.value)}
        placeholder="e.g. Current Bitcoin and Ethereum prices"
        className="min-h-24 flex-1 resize-none border-0 bg-transparent px-1 py-2.5 text-[16px] shadow-none focus-visible:ring-0 sm:px-3 dark:bg-transparent"
        aria-label="Custom query"
      />
      <Button
        size="lg"
        className="h-12 w-full shrink-0 sm:h-12 sm:w-auto sm:self-end"
        onClick={onDecompose}
        disabled={decomposing || prompt.trim().length < 4}
      >
        {decomposing ? <Loader2Icon className="animate-spin" /> : <SparkleIcon />}
        {decomposing ? "Planning…" : "Build plan"}
      </Button>
    </div>
  );
}
