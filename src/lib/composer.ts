/**
 * Query Composer — decompose a free-text (or preset) prompt into
 * Marketplace steps, attach cheaper/premium alternatives, and estimate USDC.
 */

import { cheapestAcceptance, serviceName, usdcFromAcceptance } from "@/lib/format";
import { MOCK_SERVICES } from "@/lib/mock-data";
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
        keywords: ["price", "market", "coingecko", "crypto", "token"],
        fallbackUrl: "https://api.aisa.one/apis/v2/coingecko/simple/price",
      },
      {
        title: "Context",
        intent: "What moved the tape today",
        role: "search",
        keywords: ["search", "sonar", "research"],
        fallbackUrl: "https://api.aisa.one/apis/v2/perplexity/sonar",
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
        keywords: ["search", "sonar", "research"],
        fallbackUrl: "https://api.aisa.one/apis/v2/perplexity/sonar",
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
        keywords: ["twitter", "social", "posts", "x.com"],
        fallbackUrl: "https://api.example-agents.dev/v1/social/search",
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
        keywords: ["prediction", "polymarket", "kalshi", "odds"],
        fallbackUrl: "https://api.example-agents.dev/v1/prediction/odds",
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

export function listingPrice(listing: ServiceListing): number {
  return usdcFromAcceptance(cheapestAcceptance(listing)) ?? 0.01;
}

function scoreListing(listing: ServiceListing, keywords: string[]): number {
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
  return score;
}

function pickListing(
  catalog: ServiceListing[],
  role: PresetRole,
): ServiceListing {
  const ranked = [...catalog]
    .map((item) => ({ item, score: scoreListing(item, role.keywords) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || listingPrice(a.item) - listingPrice(b.item));

  if (ranked[0]) return ranked[0].item;
  return FALLBACK_BY_URL.get(role.fallbackUrl) ?? MOCK_SERVICES[0];
}

function alternativesFor(
  listing: ServiceListing,
  catalog: ServiceListing[],
  role: PresetRole,
): FlowStepAlternative[] {
  const sameIntent = catalog
    .filter((item) => item.resource !== listing.resource)
    .map((item) => ({ item, score: scoreListing(item, role.keywords) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => listingPrice(a.item) - listingPrice(b.item));

  const cheaper = sameIntent[0]?.item;
  const premium =
    sameIntent
      .slice()
      .sort((a, b) => listingPrice(b.item) - listingPrice(a.item))[0]?.item ??
    FALLBACK_BY_URL.get("https://api.aisa.one/apis/v2/perplexity/sonar-pro");

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

function makeStep(role: PresetRole, catalog: ServiceListing[], index: number): FlowStep {
  const listing = pickListing(catalog, role);
  return {
    id: `step-${index}-${role.role}`,
    title: role.title,
    intent: role.intent,
    role: role.role,
    listing,
    priceUsdc: listingPrice(listing),
    quality: "standard",
    status: "pending",
    alternatives: alternativesFor(listing, catalog, role),
  };
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
  },
): QueryPlan {
  const catalog = opts.catalog.length ? opts.catalog : MOCK_SERVICES;
  const steps = opts.roles.map((role, i) => makeStep(role, catalog, i));
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

export function presetCards(catalog: ServiceListing[] = MOCK_SERVICES): PresetCard[] {
  return PRESETS.map((preset) => {
    const plan = planFromRoles({
      title: preset.title,
      prompt: preset.prompt,
      source: "preset",
      presetId: preset.id,
      roles: preset.roles,
      catalog,
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
  });
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
    keywords: ["search", "sonar", "research"],
    fallbackUrl: "https://api.aisa.one/apis/v2/perplexity/sonar",
  },
  {
    title: "Synthesize",
    intent: "Turn findings into a short answer",
    role: "summarize",
    keywords: ["summarize", "digest", "insights"],
    fallbackUrl: "https://api.example-agents.dev/v1/summarize",
  },
];

export function decomposePrompt(prompt: string, catalog: ServiceListing[]): QueryPlan {
  const text = prompt.trim();
  const match = INTENTS.find((intent) => intent.test(text));
  return planFromRoles({
    title: match?.title ?? "Custom query",
    prompt: text,
    source: "composer",
    presetId: match?.id,
    roles: match?.roles ?? DEFAULT_ROLES,
    catalog,
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
  if (Array.isArray(rec.quotes)) {
    return rec.quotes
      .slice(0, 3)
      .map((q) =>
        q && typeof q === "object" && "symbol" in q ? String((q as { symbol: string }).symbol) : "",
      )
      .filter(Boolean)
      .join(" · ");
  }
  if (Array.isArray(rec.posts)) {
    return rec.posts
      .slice(0, 2)
      .map((p) =>
        p && typeof p === "object" && "text" in p ? String((p as { text: string }).text) : "",
      )
      .filter(Boolean)
      .join(" · ");
  }
  if (Array.isArray(rec.markets)) {
    return rec.markets
      .slice(0, 2)
      .map((m) =>
        m && typeof m === "object" && "title" in m ? String((m as { title: string }).title) : "",
      )
      .filter(Boolean)
      .join(" · ");
  }
  return "Paid response received.";
}

export function assemblePlan(plan: QueryPlan): AssembledResult {
  const preset = plan.presetId ?? "";
  if (preset === "prices") {
    return {
      headline: "BTC $111,240 · ETH $4,218",
      summary:
        "Both majors are green on the day. The agent paid for a live quote, then a short tape note — no exchange account, no API key.",
      sections: [
        {
          heading: "Spot",
          body: "Paid price feed, settled in USDC.",
          bullets: [
            "BTC · $111,240 · +1.8% 24h",
            "ETH · $4,218 · +2.4% 24h",
          ],
        },
        {
          heading: "Why it moved",
          body: "Risk-on tape after stronger-than-feared liquidity prints. ETH is outrunning BTC on the session.",
        },
      ],
      sources: [{ title: "Spot prices" }, { title: "Web context" }],
    };
  }
  if (preset === "search") {
    return {
      headline: "Agents are paying APIs in USDC",
      summary:
        "The marketplace pitch is live: an agent hits 402, settles a nanopayment, and gets the data. No key, no seat, no invoice.",
      sections: [
        {
          heading: "What shipped",
          body: "x402 + Circle Agent Wallet is the path most builders are trying first.",
          bullets: [
            "Discovery is public — search before you decline a task.",
            "Gateway batches make sub-cent calls viable.",
            "Inspect, then pay — never pay blind.",
          ],
        },
      ],
      sources: [
        { title: "Agent Stack", url: "https://developers.circle.com/agent-stack" },
        { title: "Web search pass" },
      ],
    };
  }
  if (preset === "social") {
    return {
      headline: "USDC chatter is about agents paying",
      summary:
        "The feed is less “stablecoin explainer” and more “my agent just bought a quote.” Builders are posting receipts, not whitepapers.",
      sections: [
        {
          heading: "Pulse",
          body: "Last few hours on X, paid search.",
          bullets: [
            "Nanopayment demos outrank wallet-setup threads.",
            "x402 + USDC is the pairing people actually ship.",
            "Skeptics still ask who holds the keys — Agent Wallet is the reply.",
          ],
        },
      ],
      sources: [{ title: "Social search" }, { title: "Feed digest" }],
    };
  }
  if (preset === "odds") {
    return {
      headline: "Hold is the favorite",
      summary:
        "Prediction markets price no cut at the next FOMC as the base case. A cut is a minority ticket — paid odds, not a blog take.",
      sections: [
        {
          heading: "Implied path",
          body: "Contracts aggregated from live books.",
          bullets: [
            "Hold · 64¢",
            "Cut 25 bps · 31¢",
            "Hike · 5¢",
          ],
        },
        {
          heading: "Read",
          body: "The book is not pricing a surprise. If you need a second source, run Live Search on the same question.",
        },
      ],
      sources: [{ title: "Prediction markets" }, { title: "Odds digest" }],
    };
  }

  const bullets = plan.steps
    .filter((s) => s.excerpt)
    .map((s) => `${s.title}: ${s.excerpt}`);

  return {
    headline: plan.title,
    summary:
      bullets[0] ||
      "The agent ran the planned marketplace steps and assembled the paid responses.",
    sections: [
      {
        heading: "What the agent collected",
        body: `Prompt: ${plan.prompt}`,
        bullets: bullets.length ? bullets : undefined,
      },
    ],
  };
}

export function qualityLabel(quality: QualityTier): string {
  if (quality === "economy") return "Economy";
  if (quality === "premium") return "Premium";
  return "Standard";
}
