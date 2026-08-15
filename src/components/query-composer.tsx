"use client";

import { Loader2Icon, SplitSquareVerticalIcon } from "lucide-react";
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
    <div className="glass glow-line flex h-full min-h-0 flex-col gap-2 rounded-2xl p-3">
      <Textarea
        value={prompt}
        onChange={(e) => onPrompt(e.target.value)}
        placeholder="Ask…"
        className="min-h-0 flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-[15px] shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      <Button
        size="lg"
        className="shrink-0 self-end"
        onClick={onDecompose}
        disabled={decomposing || prompt.trim().length < 4}
      >
        {decomposing ? <Loader2Icon className="animate-spin" /> : <SplitSquareVerticalIcon />}
        Split
      </Button>
    </div>
  );
}
