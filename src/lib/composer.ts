/**
 * Query Composer — decompose a free-text (or preset) prompt into
 * Marketplace steps, attach cheaper/premium alternatives, and estimate USDC.
 */

import { cliChainFromNetwork } from "@/lib/circle-chains";
import {
  cheapestAcceptance,
  serviceDescription,
  serviceName,
  serviceTitle,
  usdcFromAcceptance,
} from "@/lib/format";
import { MOCK_SERVICES } from "@/lib/mock-data";
import {
  formatQuoteLine,
  headlineFromQuotes,
  quotesFromPayload,
  searchHitsFromPayload,
} from "@/lib/pay-result";
import type {
  AssembledResult,
  FlowStep,
  FlowStepAlternative,
  PresetCard,
  QualityTier,
  QueryPlan,
  ServiceListing,
} from "@/lib/types";

export interface PresetRole {
  title: string;
  intent: string;
  role: string;
  keywords: string[];
  fallbackUrl: string;
}

export interface PresetDefinition {
  id: string;
  title: string;
  tagline: string;
  prompt: string;
  accent: string;
  roles: PresetRole[];
}

export const PRESETS: PresetDefinition[] = [
  {
    id: "prices",
    title: "Crypto Prices",
    tagline: "Live BTC and ETH spot.",
    prompt: "Get the current price of Bitcoin and Ethereum.",
    accent: "from-cyan-400/20 to-transparent",
    roles: [
      {
        title: "Spot prices",
        intent: "Latest BTC and ETH quotes",
        role: "prices",
        keywords: ["price", "token", "allium"],
        fallbackUrl: "https://agents.allium.so/api/v1/developer/prices",
      },
      {
        title: "Context",
        intent: "What moved Bitcoin and Ethereum today",
        role: "context",
        keywords: ["exa", "search"],
        fallbackUrl: "https://api.exa.ai/search",
      },
    ],
  },
  {
    id: "search",
    title: "Live Search",
    tagline: "Paid web search, no API key.",
    prompt:
      "Search the web for the latest developments in AI agents that pay APIs with USDC.",
    accent: "from-sky-400/20 to-transparent",
    roles: [
      {
        title: "Web search",
        intent: "Find current sources on agentic USDC payments",
        role: "search",
        keywords: ["exa", "search"],
        fallbackUrl: "https://api.exa.ai/search",
      },
      {
        title: "Digest",
        intent: "Compress findings into a short brief",
        role: "summarize",
        keywords: ["summarize", "digest", "insights"],
        fallbackUrl: "https://api.example-agents.dev/v1/summarize",
      },
    ],
  },
  {
    id: "social",
    title: "Social Pulse",
    tagline: "Recent posts about USDC.",
    prompt: "Search Twitter for recent posts about Circle USDC.",
    accent: "from-violet-400/20 to-transparent",
    roles: [
      {
        title: "Social search",
        intent: "Recent posts mentioning Circle USDC",
        role: "social",
        keywords: ["exa", "search", "twitter", "social"],
        fallbackUrl: "https://api.exa.ai/search",
      },
      {
        title: "Digest",
        intent: "Turn the feed into a short pulse",
        role: "summarize",
        keywords: ["summarize", "digest", "insights"],
        fallbackUrl: "https://api.example-agents.dev/v1/summarize",
      },
    ],
  },
  {
    id: "odds",
    title: "Market Odds",
    tagline: "Prediction-market snapshot.",
    prompt: "What are the current prediction market odds for the next Fed rate decision?",
    accent: "from-amber-400/20 to-transparent",
    roles: [
      {
        title: "Odds",
        intent: "Live prediction-market contracts on the next Fed decision",
        role: "odds",
        keywords: ["exa", "search", "prediction", "odds"],
        fallbackUrl: "https://api.exa.ai/search",
      },
      {
        title: "Digest",
        intent: "Explain the implied path in one paragraph",
        role: "summarize",
        keywords: ["summarize", "digest", "insights"],
        fallbackUrl: "https://api.example-agents.dev/v1/summarize",
      },
    ],
  },
];

const FALLBACK_BY_URL = new Map(MOCK_SERVICES.map((s) => [s.resource, s]));

const DISCOVERY_QUERY_BY_PRESET: Record<string, string> = {
  prices: "allium prices",
  search: "exa",
  social: "exa",
  odds: "exa",
};

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const PIN_SELLER = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";

/** Vanilla BASE listings Execute can actually pay (CLI Gateway timeout mismatches AIsa). */
export const PINNED_LIVE_LISTINGS: ServiceListing[] = [
  {
    resource: "https://agents.allium.so/api/v1/developer/prices",
    type: "http",
    x402Version: 2,
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453",
        asset: USDC_BASE,
        amount: "20000",
        payTo: PIN_SELLER,
        extra: { name: "USD Coin", version: "2" },
      },
    ],
    metadata: {
      provider: { name: "Allium", tags: ["price", "token", "allium"] },
      method: "POST",
      description: "Spot token price by chain and contract.",
    },
  },
  {
    resource: "https://api.exa.ai/search",
    type: "http",
    x402Version: 2,
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453",
        asset: USDC_BASE,
        amount: "7000",
        payTo: PIN_SELLER,
        extra: { name: "USD Coin", version: "2" },
      },
    ],
    metadata: {
      provider: { name: "Exa", tags: ["exa", "search"] },
      method: "POST",
      description: "Web search for agents.",
    },
  },
];

export function discoveryQueryFor(presetId?: string, prompt?: string): string {
  if (presetId && DISCOVERY_QUERY_BY_PRESET[presetId]) {
    return DISCOVERY_QUERY_BY_PRESET[presetId];
  }
  return (prompt ?? "").trim() || "research";
}

export function listingPrice(listing: ServiceListing): number {
  return usdcFromAcceptance(cheapestAcceptance(listing)) ?? 0.01;
}

export function listingAcceptsChain(listing: ServiceListing, chain?: string): boolean {
  if (!chain) return false;
  const want = chain.toUpperCase();
  return (listing.accepts ?? []).some((entry) => cliChainFromNetwork(entry.network) === want);
}

export function isTemplatedResource(url: string): boolean {
  return /\{[^}/]+\}|%7B[^%]+%7D/i.test(url);
}

function withQuery(url: string, params: Record<string, string>): string {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (!parsed.searchParams.get(key)) parsed.searchParams.set(key, value);
  }
  return parsed.toString();
}

function queryFromPrompt(prompt: string, fallback: string): string {
  const text = prompt.trim();
  return (text.length >= 3 ? text : fallback).slice(0, 120);
}

/**
 * Live pay: prefer vanilla-BASE sellers. AIsa Gateway 402s use
 * maxTimeoutSeconds 604900; Circle CLI signs 2592000 → payment_requirements_mismatch.
 */
export function resolvePayRequest(
  listing: ServiceListing,
  opts?: { role?: string; prompt?: string; query?: string },
): { url: string; method: string; data?: string } {
  const prompt = (opts?.prompt ?? "").trim();
  const role = opts?.role ?? "";
  const url = listing.resource;

  if (/allium\.so\/api\/v1\/developer\/prices/i.test(url) || role === "prices") {
    return {
      url: "https://agents.allium.so/api/v1/developer/prices",
      method: "POST",
      data: JSON.stringify([
        {
          chain: "ethereum",
          token_address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        },
        {
          chain: "ethereum",
          token_address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        },
      ]),
    };
  }

  if (
    /exa\.ai\/search/i.test(url) ||
    role === "search" ||
    role === "social" ||
    role === "odds" ||
    role === "context"
  ) {
    const target = /exa\.ai\/search/i.test(url) ? url : "https://api.exa.ai/search";
    const fallback =
      role === "social"
        ? "Circle USDC"
        : role === "odds"
          ? "current Fed rate decision prediction market odds"
          : role === "context"
            ? "what moved Bitcoin and Ethereum today"
            : "USDC AI agents paying APIs";
    return {
      url: target,
      method: "POST",
      data: JSON.stringify({
        query: queryFromPrompt(opts?.query || prompt, fallback),
        numResults: 5,
        type: "auto",
      }),
    };
  }

  return { url, method: (listing.metadata?.method ?? "GET").toUpperCase() };
}

export function isMockMarketplaceHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "example-agents.dev" || host.endsWith(".example-agents.dev");
  } catch {
    return false;
  }
}

/** Live plans must bind to real hosts that accept the selected CLI chain. */
export function filterLiveCatalog(
  catalog: ServiceListing[],
  chain: string,
): ServiceListing[] {
  const pinned = PINNED_LIVE_LISTINGS.filter((item) => listingAcceptsChain(item, chain));
  const rest = catalog.filter(
    (item) =>
      !isMockMarketplaceHost(item.resource) &&
      listingAcceptsChain(item, chain) &&
      !pinned.some((pin) => pin.resource === item.resource),
  );
  return [...pinned, ...rest];
}

function scoreListing(
  listing: ServiceListing,
  keywords: string[],
  preferredChain?: string,
  live = false,
): number {
  const hay = [
    listing.resource,
    listing.metadata?.description,
    listing.metadata?.provider?.name,
    listing.metadata?.provider?.description,
    listing.metadata?.provider?.category,
    ...(listing.metadata?.provider?.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (hay.includes(kw.toLowerCase())) score += 2;
  }
  if (listingAcceptsChain(listing, preferredChain)) score += 8;
  if (live && isTemplatedResource(listing.resource)) score -= 12;
  if (live && (listing.metadata?.method ?? "GET").toUpperCase() === "GET") score += 4;
  if (live && /aisa\.one/i.test(listing.resource)) score -= 20;
  if (live && /allium\.so/i.test(listing.resource)) score += 10;
  if (live && /exa\.ai\/search/i.test(listing.resource)) score += 10;
  return score;
}

export function pickListing(
  catalog: ServiceListing[],
  role: PresetRole,
  preferredChain?: string,
  live = false,
): ServiceListing {
  if (live && role.fallbackUrl) {
    const pinned = catalog.find(
      (item) =>
        item.resource === role.fallbackUrl &&
        (!preferredChain || listingAcceptsChain(item, preferredChain)),
    );
    if (pinned) return pinned;
  }
  const eligible = catalog.filter((item) => {
    if (preferredChain && !listingAcceptsChain(item, preferredChain)) return false;
    if (live && isMockMarketplaceHost(item.resource)) return false;
    return true;
  });

  const pool = eligible.length ? eligible : live && preferredChain ? [] : catalog;
  const ranked = [...pool]
    .map((item) => ({ item, score: scoreListing(item, role.keywords, preferredChain, live) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || listingPrice(a.item) - listingPrice(b.item));

  if (ranked[0]) return ranked[0].item;
  if (pool[0]) return pool[0];

  const fallback = FALLBACK_BY_URL.get(role.fallbackUrl);
  const fallbackOk =
    fallback &&
    (!live || !isMockMarketplaceHost(fallback.resource)) &&
    (!preferredChain || listingAcceptsChain(fallback, preferredChain));
  if (fallbackOk) return fallback;

  return (
    MOCK_SERVICES.find(
      (item) =>
        (!live || !isMockMarketplaceHost(item.resource)) &&
        (!preferredChain || listingAcceptsChain(item, preferredChain)),
    ) ?? MOCK_SERVICES[0]
  );
}

function alternativesFor(
  listing: ServiceListing,
  catalog: ServiceListing[],
  role: PresetRole,
  preferredChain?: string,
  live = false,
): FlowStepAlternative[] {
  const sameIntent = catalog
    .filter((item) => {
      if (item.resource === listing.resource) return false;
      if (preferredChain && !listingAcceptsChain(item, preferredChain)) return false;
      if (live && isMockMarketplaceHost(item.resource)) return false;
      return true;
    })
    .map((item) => ({ item, score: scoreListing(item, role.keywords, preferredChain, live) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => listingPrice(a.item) - listingPrice(b.item));

  const cheaper = sameIntent[0]?.item;
  const premiumCandidate =
    sameIntent
      .slice()
      .sort((a, b) => listingPrice(b.item) - listingPrice(a.item))[0]?.item;
  const sonarPro = FALLBACK_BY_URL.get("https://api.aisa.one/apis/v2/perplexity/sonar-pro");
  const premium =
    premiumCandidate ??
    (sonarPro &&
    (!live || !isMockMarketplaceHost(sonarPro.resource)) &&
    (!preferredChain || listingAcceptsChain(sonarPro, preferredChain))
      ? sonarPro
      : undefined);

  const out: FlowStepAlternative[] = [];
  if (cheaper && listingPrice(cheaper) < listingPrice(listing)) {
    out.push({
      listing: cheaper,
      priceUsdc: listingPrice(cheaper),
      quality: "economy",
      label: serviceName(cheaper),
      note: "Cheaper · lighter output",
    });
  }
  if (premium && listingPrice(premium) > listingPrice(listing)) {
    out.push({
      listing: premium,
      priceUsdc: listingPrice(premium),
      quality: "premium",
      label: serviceName(premium),
      note: "Higher cost · deeper result",
    });
  }
  return out.slice(0, 2);
}

function pinnedListingForRole(role: PresetRole): ServiceListing | undefined {
  if (role.role === "prices" || /allium\.so/i.test(role.fallbackUrl)) {
    return PINNED_LIVE_LISTINGS.find((item) => /allium\.so/i.test(item.resource));
  }
  if (
    role.role === "search" ||
    role.role === "social" ||
    role.role === "odds" ||
    role.role === "context" ||
    /exa\.ai/i.test(role.fallbackUrl)
  ) {
    return PINNED_LIVE_LISTINGS.find((item) => /exa\.ai/i.test(item.resource));
  }
  return undefined;
}

function makeStep(
  role: PresetRole,
  catalog: ServiceListing[],
  index: number,
  preferredChain?: string,
  live = false,
): FlowStep {
  const pinned = live ? pinnedListingForRole(role) : undefined;
  const listing =
    pinned && (!preferredChain || listingAcceptsChain(pinned, preferredChain))
      ? pinned
      : pickListing(catalog, role, preferredChain, live);
  return {
    id: `step-${index}-${role.role}`,
    title: role.title,
    intent: role.intent,
    role: role.role,
    listing,
    priceUsdc: listingPrice(listing),
    quality: "standard",
    status: "pending",
    alternatives: alternativesFor(listing, catalog, role, preferredChain, live),
  };
}

const EXA_SEARCH = "https://api.exa.ai/search";

function liveFollowupRole(presetId?: string): PresetRole {
  if (presetId === "social") {
    return {
      title: "More posts",
      intent: "Circle USDC agents paying APIs recent discussion",
      role: "context",
      keywords: ["exa", "search"],
      fallbackUrl: EXA_SEARCH,
    };
  }
  if (presetId === "odds") {
    return {
      title: "Second book",
      intent: "CME FedWatch next FOMC implied probability prediction market",
      role: "context",
      keywords: ["exa", "search"],
      fallbackUrl: EXA_SEARCH,
    };
  }
  if (presetId === "prices") {
    return {
      title: "Context",
      intent: "What moved Bitcoin and Ethereum today",
      role: "context",
      keywords: ["exa", "search"],
      fallbackUrl: EXA_SEARCH,
    };
  }
  return {
    title: "Second source",
    intent: "Circle Agent Wallet x402 USDC nanopayments latest",
    role: "context",
    keywords: ["exa", "search"],
    fallbackUrl: EXA_SEARCH,
  };
}

/**
 * Live booth path: suggested cards pay two hops so Run shows the
 * micropayment chain. Custom composer stays one hop.
 * Summarize / mock hosts are remapped to vanilla Exa — AIsa Gateway 402s
 * mismatch Circle CLI timeouts.
 */
export function selectLiveRoles(
  roles: PresetRole[],
  opts: { live: boolean; source: QueryPlan["source"]; presetId?: string },
): PresetRole[] {
  if (!opts.live) return roles;
  const payable = roles.map((role) =>
    role.role === "summarize" || isMockMarketplaceHost(role.fallbackUrl)
      ? liveFollowupRole(opts.presetId)
      : role,
  );
  if (opts.source === "preset") return payable.slice(0, 2);
  return payable.slice(0, 1);
}

function planFromRoles(
  opts: {
    title: string;
    prompt: string;
    source: QueryPlan["source"];
    presetId?: string;
    roles: PresetRole[];
    catalog: ServiceListing[];
    note?: string;
    preferredChain?: string;
    live?: boolean;
  },
): QueryPlan {
  let catalog = opts.catalog;
  if (opts.live && opts.preferredChain) {
    catalog = filterLiveCatalog(opts.catalog, opts.preferredChain);
    if (catalog.length === 0) {
      return {
        id: `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        title: opts.title,
        prompt: opts.prompt,
        source: opts.source,
        presetId: opts.presetId,
        steps: [],
        estimatedTotal: 0,
        spentTotal: 0,
        note: opts.note,
      };
    }
  } else if (!catalog.length) {
    catalog = MOCK_SERVICES;
  }
  const roles = selectLiveRoles(opts.roles, {
    live: Boolean(opts.live),
    source: opts.source,
    presetId: opts.presetId,
  });
  const steps = roles.map((role, i) =>
    makeStep(role, catalog, i, opts.preferredChain, opts.live),
  );
  return {
    id: `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: opts.title,
    prompt: opts.prompt,
    source: opts.source,
    presetId: opts.presetId,
    steps,
    estimatedTotal: Number(steps.reduce((sum, s) => sum + s.priceUsdc, 0).toFixed(6)),
    spentTotal: 0,
    note: opts.note,
  };
}

export function presetCards(
  catalog: ServiceListing[] = MOCK_SERVICES,
  opts?: { preferredChain?: string; live?: boolean },
): PresetCard[] {
  return PRESETS.map((preset) => {
    const plan = planFromRoles({
      title: preset.title,
      prompt: preset.prompt,
      source: "preset",
      presetId: preset.id,
      roles: preset.roles,
      catalog,
      preferredChain: opts?.preferredChain,
      live: opts?.live,
    });
    return {
      id: preset.id,
      title: preset.title,
      tagline: preset.tagline,
      prompt: preset.prompt,
      accent: preset.accent,
      serviceLabels: plan.steps.map((s) => `${s.title} · ${serviceName(s.listing)}`),
      estimatedUsdc: plan.estimatedTotal,
    };
  });
}

export function decomposePreset(
  presetId: string,
  catalog: ServiceListing[],
  preferredChain?: string,
  live = false,
): QueryPlan | null {
  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset) return null;
  return planFromRoles({
    title: preset.title,
    prompt: preset.prompt,
    source: "preset",
    presetId: preset.id,
    roles: preset.roles,
    catalog,
    preferredChain,
    live,
  });
}

export function liveCatalogNote(network: {
  label: string;
  caip2: string;
  marketplaceLive: boolean;
}): string {
  if (network.marketplaceLive) {
    return `Discovery returned no payable x402 sellers on ${network.label} (${network.caip2}) for this query.`;
  }
  return `Discovery has no x402 sellers on ${network.label} (${network.caip2}). The public catalog is mainnet-only right now. Use Demo Mode to walk the flow, or switch to a network with a live catalog.`;
}

export function emptyLivePlan(
  chain: string,
  prompt: string,
  networkLabel: string,
  note: string,
): QueryPlan {
  return {
    id: `plan-empty-${chain}`,
    title: `No ${networkLabel} sellers`,
    prompt,
    source: "composer",
    steps: [],
    estimatedTotal: 0,
    spentTotal: 0,
    note,
  };
}

export function decomposeLive(opts: {
  prompt?: string;
  presetId?: string;
  catalog: ServiceListing[];
  chain: string;
  network: { label: string; shortLabel: string; caip2: string; marketplaceLive: boolean };
}): QueryPlan | null {
  const prompt = (opts.prompt ?? "").trim() || opts.presetId || "";
  const catalog = filterLiveCatalog(opts.catalog, opts.chain);
  if (catalog.length === 0) {
    return emptyLivePlan(
      opts.chain,
      prompt,
      opts.network.shortLabel,
      liveCatalogNote(opts.network),
    );
  }
  if (opts.presetId) {
    return decomposePreset(opts.presetId, catalog, opts.chain, true);
  }
  return decomposePrompt(opts.prompt ?? "", catalog, opts.chain, true);
}

interface IntentTemplate {
  id: string;
  title: string;
  test: (text: string) => boolean;
  roles: PresetRole[];
}

const INTENTS: IntentTemplate[] = [
  {
    id: "social",
    title: "Social Pulse",
    test: (t) => /(twitter|\bx\b|tweet|social|posts? about)/i.test(t),
    roles: PRESETS[2].roles,
  },
  {
    id: "odds",
    title: "Market Odds",
    test: (t) => /(prediction|polymarket|kalshi|odds|fed rate|election)/i.test(t),
    roles: PRESETS[3].roles,
  },
  {
    id: "prices",
    title: "Crypto Prices",
    test: (t) => /(precio|price|bitcoin|ethereum|\bbtc\b|\beth\b|spot)/i.test(t),
    roles: PRESETS[0].roles,
  },
  {
    id: "search",
    title: "Live Search",
    test: (t) => /(search the web|investiga|research|latest developments|qué es|what is)/i.test(t),
    roles: PRESETS[1].roles,
  },
  {
    id: "weather",
    title: "Weather check",
    test: (t) => /(weather|clima|lluvia|precip)/i.test(t),
    roles: [
      {
        title: "Forecast",
        intent: "Hourly weather / precipitation",
        role: "weather",
        keywords: ["weather", "precip", "hourly"],
        fallbackUrl: "https://np.orthogonal.com/precip/api/v1/hourly",
      },
    ],
  },
];

const DEFAULT_ROLES: PresetRole[] = [
  {
    title: "Web search",
    intent: "Find relevant sources",
    role: "search",
    keywords: ["exa", "search"],
    fallbackUrl: "https://api.exa.ai/search",
  },
  {
    title: "Synthesize",
    intent: "Turn findings into a short answer",
    role: "summarize",
    keywords: ["summarize", "digest", "insights"],
    fallbackUrl: "https://api.example-agents.dev/v1/summarize",
  },
];

function roleForListing(listing: ServiceListing): string {
  const url = listing.resource;
  if (/allium\.so\/api\/v1\/developer\/prices$/i.test(url)) return "prices";
  if (/exa\.ai\/search/i.test(url)) return "search";
  return "catalog";
}

/** One-hop plan from a catalog row the user picked in Query. */
export function planFromListing(
  listing: ServiceListing,
  opts?: { prompt?: string },
): QueryPlan {
  const title = serviceTitle(listing);
  const role = roleForListing(listing);
  const step: FlowStep = {
    id: `step-0-${role}`,
    title,
    intent: serviceDescription(listing),
    role,
    listing,
    priceUsdc: listingPrice(listing),
    quality: "standard",
    status: "pending",
    alternatives: [],
  };
  return {
    id: `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    prompt: (opts?.prompt ?? "").trim() || title,
    source: "composer",
    steps: [step],
    estimatedTotal: step.priceUsdc,
    spentTotal: 0,
    note: `Picked ${serviceName(listing)} from the catalog.`,
  };
}

export function decomposePrompt(
  prompt: string,
  catalog: ServiceListing[],
  preferredChain?: string,
  live = false,
): QueryPlan {
  const text = prompt.trim();
  const match = INTENTS.find((intent) => intent.test(text));
  return planFromRoles({
    title: match?.title ?? "Custom query",
    prompt: text,
    source: "composer",
    presetId: match?.id,
    roles: match?.roles ?? DEFAULT_ROLES,
    catalog,
    preferredChain,
    live,
    note: match
      ? `Matched intent “${match.title}”.`
      : "No preset intent — defaulted to search + synthesize.",
  });
}

export function applyAlternative(
  plan: QueryPlan,
  stepId: string,
  quality: QualityTier,
): QueryPlan {
  const steps = plan.steps.map((step) => {
    if (step.id !== stepId) return step;
    const alt = step.alternatives.find((a) => a.quality === quality);
    if (!alt) return step;
    const previous: FlowStepAlternative = {
      listing: step.listing,
      priceUsdc: step.priceUsdc,
      quality: step.quality,
      label: serviceName(step.listing),
      note: "Previously selected",
    };
    const others = [
      previous,
      ...step.alternatives.filter((a) => a.listing.resource !== alt.listing.resource),
    ];
    return {
      ...step,
      listing: alt.listing,
      priceUsdc: alt.priceUsdc,
      quality: alt.quality,
      alternatives: others,
      status: "pending" as const,
      result: undefined,
      excerpt: undefined,
      error: undefined,
      paidUsdc: undefined,
    };
  });
  return {
    ...plan,
    steps,
    estimatedTotal: Number(steps.reduce((sum, s) => sum + s.priceUsdc, 0).toFixed(6)),
    assembled: undefined,
    spentTotal: 0,
  };
}

export function removeStep(plan: QueryPlan, stepId: string): QueryPlan {
  const steps = plan.steps.filter((s) => s.id !== stepId);
  return {
    ...plan,
    steps,
    estimatedTotal: Number(steps.reduce((sum, s) => sum + s.priceUsdc, 0).toFixed(6)),
    assembled: undefined,
  };
}

export function excerptFromResult(result: unknown): string {
  const quotes = quotesFromPayload(result);
  if (quotes.length) return headlineFromQuotes(quotes);
  const hits = searchHitsFromPayload(result);
  if (hits.length) {
    return hits
      .slice(0, 2)
      .map((hit) => hit.title)
      .join(" · ");
  }
  if (!result || typeof result !== "object") return String(result ?? "");
  const rec = result as Record<string, unknown>;
  if (typeof rec.digest === "string") return rec.digest;
  if (typeof rec.answer === "string") return rec.answer;
  if (typeof rec.text === "string") return rec.text;
  if (typeof rec.message === "string") return rec.message;
  if (Array.isArray(rec.ideas)) return rec.ideas.slice(0, 2).join(" · ");
  if (Array.isArray(rec.events)) {
    return rec.events
      .slice(0, 2)
      .map((e) => (e && typeof e === "object" && "name" in e ? String(e.name) : ""))
      .filter(Boolean)
      .join(" · ");
  }
  return "Paid response received.";
}

function sourcesFromPlan(plan: QueryPlan): { title: string; url?: string }[] {
  return plan.steps.map((step) => ({
    title: serviceName(step.listing),
    url: step.listing.resource,
  }));
}

function assembleFromPaidSteps(plan: QueryPlan): AssembledResult | null {
  const quotes = plan.steps.flatMap((step) => quotesFromPayload(step.result));
  const hits = plan.steps.flatMap((step) => searchHitsFromPayload(step.result));
  if (!quotes.length && !hits.length) return null;

  if (quotes.length) {
    const stamped = quotes.find((q) => q.timestamp)?.timestamp;
    const asOf = stamped
      ? ` As of ${new Date(stamped).toLocaleString("en-US", { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" })}.`
      : "";
    const sections: AssembledResult["sections"] = [
      {
        heading: "Spot",
        body: `Paid Allium for live token prices. These numbers came back in the seller body after x402 settlement — not a demo fixture.${asOf}`,
        bullets: quotes.map(formatQuoteLine),
      },
    ];
    if (hits.length) {
      sections.push({
        heading: "Context",
        body: "Paid web search on the same run.",
        bullets: hits.map((hit) => (hit.snippet ? `${hit.title} — ${hit.snippet.slice(0, 140)}` : hit.title)),
      });
    }
    return {
      headline: headlineFromQuotes(quotes),
      summary: `Live ${quotes.map((q) => q.symbol).join(" / ")} from the marketplace hop you just paid.`,
      sections,
      sources: sourcesFromPlan(plan),
    };
  }

  return {
    headline: hits[0]?.title ?? plan.title,
    summary: `Paid search returned ${hits.length} source${hits.length === 1 ? "" : "s"}. No canned copy — these titles came from the seller.`,
    sections: [
      {
        heading: "Sources",
        body: plan.prompt,
        bullets: hits.map((hit) =>
          hit.snippet ? `${hit.title} — ${hit.snippet.slice(0, 160)}` : hit.title,
        ),
      },
    ],
    sources: [
      ...hits.filter((hit) => hit.url).map((hit) => ({ title: hit.title, url: hit.url })),
      ...sourcesFromPlan(plan),
    ],
  };
}

export function assemblePlan(plan: QueryPlan): AssembledResult {
  const fromPaid = assembleFromPaidSteps(plan);
  if (fromPaid) return fromPaid;

  const bullets = plan.steps
    .filter((s) => s.excerpt || s.error)
    .map((s) => (s.error ? `${s.title}: ${s.error}` : `${s.title}: ${s.excerpt}`));
  const failed = plan.steps.some((s) => s.status === "error");

  return {
    headline: plan.title,
    summary: failed
      ? "The run stopped before a seller returned data. Nothing on this card is a mock quote."
      : bullets[0] ||
        "The agent ran the planned marketplace steps. No parseable seller body was returned.",
    sections: [
      {
        heading: "What the agent collected",
        body: `Prompt: ${plan.prompt}`,
        bullets: bullets.length ? bullets : undefined,
      },
    ],
    sources: sourcesFromPlan(plan),
  };
}

export function qualityLabel(quality: QualityTier): string {
  if (quality === "economy") return "Economy";
  if (quality === "premium") return "Premium";
  return "Standard";
}
