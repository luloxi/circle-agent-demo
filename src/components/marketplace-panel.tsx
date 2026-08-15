"use client";

import { SearchIcon, Loader2Icon, ScanSearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  cheapestAcceptance,
  serviceName,
  usdcFromAcceptance,
} from "@/lib/format";
import { UsdcAmount } from "@/components/usdc-amount";
import type { InspectResult, ServiceListing } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "", label: "All" },
  { id: "FINANCIAL_ANALYSIS", label: "Finance" },
  { id: "WEB_SEARCH_RESEARCH", label: "Research" },
  { id: "DATA_ENRICHMENT", label: "Data" },
  { id: "CREATIVE", label: "Creative" },
  { id: "INFRASTRUCTURE", label: "Infra" },
];

export function MarketplacePanel({
  query,
  onQuery,
  category,
  onCategory,
  onSearch,
  searching,
  services,
  selected,
  onSelect,
  onInspect,
  onPay,
  inspecting,
}: {
  query: string;
  onQuery: (value: string) => void;
  category: string;
  onCategory: (value: string) => void;
  onSearch: () => void;
  searching: boolean;
  services: ServiceListing[];
  total: number;
  source: string | null;
  note?: string;
  selected: ServiceListing | null;
  onSelect: (service: ServiceListing) => void;
  onInspect: () => void;
  onPay: () => void;
  inspecting: boolean;
  inspect: InspectResult | null;
}) {
  return (
    <div className="glass flex h-full min-h-0 flex-col space-y-3 overflow-hidden p-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
      >
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search"
            className="h-11 border-white/8 bg-white/4 pl-9"
          />
        </div>
        <Button type="submit" size="lg" disabled={searching} aria-label="Search">
          {searching ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
        </Button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((item) => (
          <button
            key={item.id || "all"}
            type="button"
            onClick={() => onCategory(item.id)}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] tracking-wide transition-colors",
              category === item.id
                ? "bg-cyan/15 text-cyan"
                : "bg-white/4 text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-2 overflow-auto pr-1">
        {searching && services.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))
          : null}
        {services.map((service) => {
          const active = selected?.resource === service.resource;
          const price = usdcFromAcceptance(cheapestAcceptance(service));
          return (
            <button
              key={service.resource}
              type="button"
              onClick={() => onSelect(service)}
              className={cn(
                "flex items-center justify-between gap-4 rounded-xl px-4 py-3.5 text-left transition-all",
                active
                  ? "bg-cyan/10 ring-1 ring-cyan/30"
                  : "bg-white/3 hover:bg-white/6",
              )}
            >
              <span className="min-w-0 truncate text-sm">{serviceName(service)}</span>
              <UsdcAmount amount={price} size="md" className="shrink-0" />
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={onInspect} disabled={inspecting}>
            {inspecting ? <Loader2Icon className="animate-spin" /> : <ScanSearchIcon />}
            Inspect
          </Button>
          <Button size="lg" onClick={onPay}>
            Pay
          </Button>
        </div>
      ) : null}
    </div>
  );
}
