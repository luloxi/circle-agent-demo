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
}: {
  network: NetworkId;
  compact?: boolean;
  onDemo: () => void;
  onNetwork: (id: NetworkId) => void;
}) {
  const net = getNetwork(network);
  if (net.marketplaceLive) return null;

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Discovery has no x402 sellers on {net.shortLabel} yet. The live catalog
        is mainnet-only. Walk the flow in Demo, or switch to a network that
        already has listings.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" onClick={onDemo}>
          <SparkleIcon />
          Use Demo
        </Button>
        {LIVE_CATALOG_NETWORKS.map((item) => (
          <Button
            key={item.id}
            size="lg"
            variant="outline"
            onClick={() => onNetwork(item.id)}
          >
            Switch to {item.shortLabel}
          </Button>
        ))}
      </div>
    </div>
  );
}
