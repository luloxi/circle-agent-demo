"use client";

import { SparkleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNetwork, LIVE_CATALOG_NETWORKS } from "@/lib/networks";
import type { NetworkId } from "@/lib/types";

export function CatalogEscape({
  network,
  compact,
  onDemo,
  onNetwork,
  note,
  allowLiveEmpty,
}: {
  network: NetworkId;
  compact?: boolean;
  onDemo: () => void;
  onNetwork: (id: NetworkId) => void;
  note?: string;
  /** Empty live plans (Base) still need the note + Demo — do not no-op. */
  allowLiveEmpty?: boolean;
}) {
  const net = getNetwork(network);
  if (net.marketplaceLive && !allowLiveEmpty) return null;

  const body =
    note ||
    (net.marketplaceLive
      ? `Discovery returned no payable x402 sellers on ${net.label} (${net.caip2}) for this query.`
      : `Discovery has no x402 sellers on ${net.shortLabel} yet. The live catalog is mainnet-only. Walk the flow in Demo, or switch to a network that already has listings.`);

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" onClick={onDemo}>
          <SparkleIcon />
          Use Demo
        </Button>
        {!net.marketplaceLive
          ? LIVE_CATALOG_NETWORKS.map((item) => (
              <Button
                key={item.id}
                size="lg"
                variant="outline"
                onClick={() => onNetwork(item.id)}
              >
                Switch to {item.shortLabel}
              </Button>
            ))
          : null}
      </div>
    </div>
  );
}
