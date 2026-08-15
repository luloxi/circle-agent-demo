/**
 * Curated fixtures so Demo Mode always looks great — even offline.
 * Shapes match the live Discovery API so the UI can treat both identically.
 */

import type {
  DiscoveryResponse,
  InspectResult,
  PayResult,
  ServiceListing,
  WalletInfo,
} from "@/lib/types";
import { cheapestAcceptance, usdcFromAcceptance } from "@/lib/format";

export const DEMO_WALLET: WalletInfo = {
  address: "0xA93d4E8c1B7f2a90C6eD4b8F0A12E9d5C3f2C1a4",
  chain: "ARC-TESTNET",
  type: "agent",
  email: "demo@agents.circle.com",
};

export const DEMO_STARTING_BALANCE = 25;
export const DEMO_FUND_AMOUNT = 10;

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_ARC_TESTNET = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const SELLER = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";

function listing(
  partial: Omit<ServiceListing, "type" | "x402Version" | "lastUpdated"> &
    Partial<Pick<ServiceListing, "type" | "x402Version" | "lastUpdated">>,
): ServiceListing {
  return {
    type: "http",
    x402Version: 2,
    lastUpdated: "2026-08-12T14:23:24.827Z",
    ...partial,
  };
}

export const MOCK_SERVICES: ServiceListing[] = [
  listing({
    resource: "https://np.orthogonal.com/precip/api/v1/hourly",
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453",
        asset: USDC_BASE,
        amount: "10000",
        payTo: SELLER,
        extra: { name: "USD Coin", version: "2" },
      },
      {
        scheme: "exact",
        network: "eip155:5042002",
        asset: USDC_ARC_TESTNET,
        amount: "10000",
        payTo: SELLER,
        extra: { name: "USD Coin", version: "2" },
      },
    ],
    metadata: {
      provider: {
        name: "Orthogonal",
        description: "Observation-based precipitation and weather data API",
        category: "DATA_ENRICHMENT",
        tags: ["weather", "precipitation", "climate"],
        website: "https://www.orthogonal.com/discover/precip",
        docsUrl: "https://api-docs.precip.ai/overview",
      },
      path: "/precip/api/v1/hourly",
      method: "GET",
      description: "Hourly precipitation and cloud-cover forecast for any lat/lng.",
      mimeType: "application/json",
      siwx: false,
      supportsVanillax402: false,
      supportsCircleGateway: true,
      input: {
        type: "object",
        properties: {
          lat: { type: "number" },
          lng: { type: "number" },
        },
      },
    },
  }),
  listing({
    resource: "https://agents.allium.so/api/v1/developer/prices",
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453",
        asset: USDC_BASE,
        amount: "20000",
        payTo: SELLER,
        extra: { name: "USD Coin", version: "2" },
      },
    ],
    metadata: {
      provider: {
        name: "Allium",
        description: "Onchain market data for agents",
        category: "FINANCIAL_ANALYSIS",
        tags: ["prices", "tokens", "market-data"],
        website: "https://www.allium.so",
      },
      path: "/api/v1/developer/prices",
      method: "GET",
      description: "Latest spot price for one or more tokens by chain and contract.",
      mimeType: "application/json",
      siwx: false,
      supportsVanillax402: true,
      supportsCircleGateway: true,
    },
  }),
  listing({
    resource: "https://api.aisa.one/apis/v2/perplexity/sonar",
    accepts: [
      {
        scheme: "exact",
        network: "eip155:1",
        asset: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        amount: "12000",
        payTo: SELLER,
        extra: { name: "USD Coin", version: "2" },
      },
    ],
    metadata: {
      provider: {
        name: "AIsa API",
        description: "Search and research endpoints for agents",
        category: "WEB_SEARCH_RESEARCH",
        tags: ["search", "research", "sonar"],
        website: "https://aisa.one",
        docsUrl: "https://aisa.one/docs/api-reference",
      },
      path: "/apis/v2/perplexity/sonar",
      method: "POST",
      description: "Sonar — lightweight web search plus a grounded answer.",
      mimeType: "application/json",
      siwx: false,
      supportsVanillax402: true,
      supportsCircleGateway: true,
      input: {
        type: "object",
        properties: { query: { type: "string" } },
      },
    },
  }),
  listing({
    resource: "https://api.aisa.one/apis/v2/coingecko/simple/price",
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453",
        asset: USDC_BASE,
        amount: "10000",
        payTo: SELLER,
        extra: { name: "USD Coin", version: "2" },
      },
    ],
    metadata: {
      provider: {
        name: "AIsa API",
        description: "Cryptocurrency market data prices",
        category: "FINANCIAL_ANALYSIS",
        tags: ["x402", "crypto", "market-data"],
        website: "https://aisa.one",
      },
      path: "/apis/v2/coingecko/simple/price",
      method: "GET",
      description: "Get cryptocurrency prices in multiple currencies.",
      mimeType: "application/json",
      siwx: false,
      supportsVanillax402: true,
      supportsCircleGateway: true,
    },
  }),
  listing({
    resource: "https://api.example-agents.dev/v1/domain/suggest",
    accepts: [
      {
        scheme: "exact",
        network: "eip155:5042002",
        asset: USDC_ARC_TESTNET,
        amount: "5000",
        payTo: SELLER,
        extra: { name: "USD Coin", version: "2" },
      },
    ],
    metadata: {
      provider: {
        name: "Nameforge",
        description: "Domain ideation and availability for agent projects",
        category: "CREATIVE",
        tags: ["domains", "naming", "brand"],
        website: "https://agents.circle.com/services",
      },
      path: "/v1/domain/suggest",
      method: "POST",
      description: "Suggest brandable names and check .com / alt-TLD availability.",
      mimeType: "application/json",
      siwx: false,
      supportsVanillax402: true,
      supportsCircleGateway: true,
    },
  }),
  listing({
    resource: "https://api.example-agents.dev/v1/events/ba",
    accepts: [
      {
        scheme: "exact",
        network: "eip155:5042002",
        asset: USDC_ARC_TESTNET,
        amount: "8000",
        payTo: SELLER,
        extra: { name: "USD Coin", version: "2" },
      },
    ],
    metadata: {
      provider: {
        name: "BA Pulse",
        description: "Crypto and AI events in Buenos Aires",
        category: "SOCIAL_INTELLIGENCE",
        tags: ["events", "buenos-aires", "meetup", "crypto", "ai"],
      },
      path: "/v1/events/ba",
      method: "GET",
      description: "Upcoming crypto, AI, and builder events in Buenos Aires.",
      mimeType: "application/json",
      siwx: false,
      supportsVanillax402: true,
      supportsCircleGateway: true,
    },
  }),
  listing({
    resource: "https://api.example-agents.dev/v1/translate",
    accepts: [
      {
        scheme: "exact",
        network: "eip155:5042002",
        asset: USDC_ARC_TESTNET,
        amount: "6000",
        payTo: SELLER,
        extra: { name: "USD Coin", version: "2" },
      },
    ],
    metadata: {
      provider: {
        name: "Lumen Translate",
        description: "Fast ES↔EN translation for agents",
        category: "CREATIVE",
        tags: ["translate", "spanish", "english", "language"],
      },
      path: "/v1/translate",
      method: "POST",
      description: "Translate short copy between Spanish and English.",
      mimeType: "application/json",
      siwx: false,
      supportsVanillax402: true,
      supportsCircleGateway: true,
    },
  }),
  listing({
    resource: "https://api.example-agents.dev/v1/polish",
    accepts: [
      {
        scheme: "exact",
        network: "eip155:5042002",
        asset: USDC_ARC_TESTNET,
        amount: "8000",
        payTo: SELLER,
        extra: { name: "USD Coin", version: "2" },
      },
    ],
    metadata: {
      provider: {
        name: "Copyloom",
        description: "Rewrite and polish for product and agent copy",
        category: "CREATIVE",
        tags: ["polish", "rewrite", "copy", "edit"],
      },
      path: "/v1/polish",
      method: "POST",
      description: "Tighten tone, clarity, and rhythm of a short text.",
      mimeType: "application/json",
      siwx: false,
      supportsVanillax402: true,
      supportsCircleGateway: true,
    },
  }),
  listing({
    resource: "https://api.example-agents.dev/v1/ideas",
    accepts: [
      {
        scheme: "exact",
        network: "eip155:5042002",
        asset: USDC_ARC_TESTNET,
        amount: "10000",
        payTo: SELLER,
        extra: { name: "USD Coin", version: "2" },
      },
    ],
    metadata: {
      provider: {
        name: "Sparkline",
        description: "Product and agent ideation",
        category: "CREATIVE",
        tags: ["ideas", "products", "agents", "brainstorm"],
      },
      path: "/v1/ideas",
      method: "POST",
      description: "Generate product and agent concepts from a brief.",
      mimeType: "application/json",
      siwx: false,
      supportsVanillax402: true,
      supportsCircleGateway: true,
    },
  }),
  listing({
    resource: "https://api.example-agents.dev/v1/summarize",
    accepts: [
      {
        scheme: "exact",
        network: "eip155:5042002",
        asset: USDC_ARC_TESTNET,
        amount: "7000",
        payTo: SELLER,
        extra: { name: "USD Coin", version: "2" },
      },
    ],
    metadata: {
      provider: {
        name: "Nucleus",
        description: "Cheap extractive summaries for agents",
        category: "WEB_SEARCH_RESEARCH",
        tags: ["summarize", "digest", "insights"],
      },
      path: "/v1/summarize",
      method: "POST",
      description: "Compress notes into a short digest with key takeaways.",
      mimeType: "application/json",
      siwx: false,
      supportsVanillax402: true,
      supportsCircleGateway: true,
    },
  }),
  listing({
    resource: "https://api.aisa.one/apis/v2/perplexity/sonar-pro",
    accepts: [
      {
        scheme: "exact",
        network: "eip155:1",
        asset: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        amount: "28000",
        payTo: SELLER,
        extra: { name: "USD Coin", version: "2" },
      },
    ],
    metadata: {
      provider: {
        name: "AIsa API",
        description: "Deeper search for complex queries",
        category: "WEB_SEARCH_RESEARCH",
        tags: ["search", "research", "sonar-pro", "premium"],
        website: "https://aisa.one",
      },
      path: "/apis/v2/perplexity/sonar-pro",
      method: "POST",
      description: "Sonar Pro — deeper research for complex queries.",
      mimeType: "application/json",
      siwx: false,
      supportsVanillax402: true,
      supportsCircleGateway: true,
    },
  }),
  listing({
    resource: "https://api.example-agents.dev/v1/brief/company",
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453",
        asset: USDC_BASE,
        amount: "15000",
        payTo: SELLER,
        extra: { name: "USD Coin", version: "2" },
      },
    ],
    metadata: {
      provider: {
        name: "Briefing Room",
        description: "Company and people briefs for meeting prep",
        category: "WEB_SEARCH_RESEARCH",
        tags: ["research", "brief", "company"],
      },
      path: "/v1/brief/company",
      method: "POST",
      description: "Pull a compact company brief: size, funding, recent news.",
      mimeType: "application/json",
      siwx: false,
      supportsVanillax402: true,
      supportsCircleGateway: true,
    },
  }),
  listing({
    resource: "https://api.example-agents.dev/v1/social/search",
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453",
        asset: USDC_BASE,
        amount: "9000",
        payTo: SELLER,
        extra: { name: "USD Coin", version: "2" },
      },
    ],
    metadata: {
      provider: {
        name: "Pulse Social",
        description: "Recent posts and mentions for agents",
        category: "SOCIAL_INTELLIGENCE",
        tags: ["twitter", "social", "posts", "x.com"],
      },
      path: "/v1/social/search",
      method: "GET",
      description: "Search recent public posts by keyword.",
      mimeType: "application/json",
      siwx: false,
      supportsVanillax402: true,
      supportsCircleGateway: true,
    },
  }),
  listing({
    resource: "https://api.example-agents.dev/v1/prediction/odds",
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453",
        asset: USDC_BASE,
        amount: "11000",
        payTo: SELLER,
        extra: { name: "USD Coin", version: "2" },
      },
    ],
    metadata: {
      provider: {
        name: "Bookline",
        description: "Prediction-market odds for agents",
        category: "PREDICTION_MARKETS",
        tags: ["prediction", "polymarket", "kalshi", "odds"],
      },
      path: "/v1/prediction/odds",
      method: "GET",
      description: "Live contracts and implied probabilities for a question.",
      mimeType: "application/json",
      siwx: false,
      supportsVanillax402: true,
      supportsCircleGateway: true,
    },
  }),
];

export function filterMockServices(opts: {
  query?: string;
  category?: string;
  limit?: number;
}): DiscoveryResponse {
  const q = opts.query?.trim().toLowerCase() ?? "";
  const category = opts.category?.trim();
  const limit = opts.limit ?? 24;

  const items = MOCK_SERVICES.filter((item) => {
    if (category && item.metadata?.provider?.category !== category) return false;
    if (!q) return true;
    const hay = [
      item.resource,
      item.metadata?.description,
      item.metadata?.provider?.name,
      item.metadata?.provider?.description,
      ...(item.metadata?.provider?.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  }).slice(0, limit);

  return {
    x402Version: 2,
    items,
    pagination: { limit, offset: 0, total: items.length },
  };
}

export function findMockService(url: string): ServiceListing | undefined {
  return MOCK_SERVICES.find((s) => s.resource === url);
}

export function mockInspect(url: string): InspectResult {
  const listing = findMockService(url);
  const accepts = listing?.accepts ?? [];
  const cheapest = listing ? cheapestAcceptance(listing) : undefined;
  return {
    url,
    method: listing?.metadata?.method ?? "GET",
    description: listing?.metadata?.description,
    accepts,
    metadata: listing?.metadata,
    priceUsdc: usdcFromAcceptance(cheapest),
    supportsCircleGateway: listing?.metadata?.supportsCircleGateway ?? true,
    supportsVanillax402: listing?.metadata?.supportsVanillax402 ?? true,
    source: "demo",
    raw: {
      x402Version: 2,
      resource: url,
      accepts,
      metadata: listing?.metadata,
    },
  };
}

export function mockPay(opts: {
  url: string;
  address: string;
  chain: string;
  maxAmount: number;
}): PayResult {
  const listing = findMockService(opts.url);
  const cheapest = listing ? cheapestAcceptance(listing) : undefined;
  const price = usdcFromAcceptance(cheapest) ?? 0.01;

  return {
    ok: true,
    demo: true,
    url: opts.url,
    chain: opts.chain,
    address: opts.address,
    amountUsdc: price,
    status: 200,
    paid: true,
    response: mockServicePayload(opts.url, price, opts.chain, opts.address),
  };
}

export function mockServicePayload(
  url: string,
  amountUsdc: number,
  chain: string,
  address: string,
): unknown {
  const receipt = {
    protocol: "x402",
    rail: "circle-gateway",
    paid: true,
    amountUsdc,
    asset: "USDC",
    chain,
    payer: address,
    settledAt: new Date().toISOString(),
    paymentId: `npay_${Math.random().toString(36).slice(2, 10)}`,
  };

  if (url.includes("precip") || url.includes("weather")) {
    return {
      service: "Orthogonal / hourly precipitation",
      location: { lat: 37.7749, lng: -122.4194, name: "San Francisco, CA" },
      units: "mm",
      current: { tempC: 16.4, condition: "partly cloudy", humidity: 72 },
      hourly: [
        { t: "16:00Z", precipMm: 0.0, cloud: 0.42 },
        { t: "17:00Z", precipMm: 0.1, cloud: 0.55 },
        { t: "18:00Z", precipMm: 0.4, cloud: 0.71 },
      ],
      receipt,
    };
  }

  if (url.includes("allium") || url.includes("developer/prices")) {
    const now = new Date().toISOString();
    return {
      items: [
        {
          timestamp: now,
          chain: "ethereum",
          address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
          decimals: 8,
          price: 111240,
          open: 109270,
          high: 112010,
          close: 111240,
          low: 108880,
        },
        {
          timestamp: now,
          chain: "ethereum",
          address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          decimals: 18,
          price: 4218,
          open: 4119,
          high: 4250,
          close: 4218,
          low: 4095,
        },
      ],
      receipt,
    };
  }

  if (url.includes("prices") || url.includes("coingecko")) {
    return {
      service: "Spot prices",
      quotes: [
        { id: "bitcoin", symbol: "BTC", usd: 111240, change24h: 1.8 },
        { id: "ethereum", symbol: "ETH", usd: 4218, change24h: 2.4 },
      ],
      asOf: new Date().toISOString(),
      receipt,
    };
  }

  if (url.includes("sonar") || url.includes("brief")) {
    return {
      service: "Research brief",
      query: "Circle Agent Stack nanopayments",
      answer:
        "Circle Agent Stack lets an agent hold a policy-controlled USDC wallet, discover x402 services in the Agent Marketplace, and settle per-request nanopayments through Circle Gateway — typically without gas, API keys, or a human in the loop.",
      sources: [
        { title: "Agent stack", url: "https://developers.circle.com/agent-stack" },
        {
          title: "Discovery API",
          url: "https://developers.circle.com/agent-stack/agent-marketplace/discovery-api",
        },
      ],
      receipt,
    };
  }

  if (url.includes("domain")) {
    return {
      service: "Nameforge suggestions",
      names: [
        { name: "agentrail.com", available: false, priceUsd: null },
        { name: "nanopay.dev", available: true, priceUsd: 12 },
        { name: "x402kit.com", available: true, priceUsd: 18 },
        { name: "circletide.io", available: true, priceUsd: 24 },
      ],
      receipt,
    };
  }

  if (url.includes("events/ba")) {
    return {
      service: "BA Pulse / events",
      city: "Buenos Aires",
      window: "this week",
      events: [
        {
          name: "ETH Buenos Aires meetup",
          when: "Thu 19:00",
          where: "Palermo",
          tags: ["ethereum", "builders"],
        },
        {
          name: "AI × Payments salon",
          when: "Fri 18:30",
          where: "Puerto Madero",
          tags: ["agents", "USDC"],
        },
        {
          name: "Stablecoin breakfast",
          when: "Sat 10:00",
          where: "Recoleta",
          tags: ["circle", "fintech"],
        },
      ],
      receipt,
    };
  }

  if (url.includes("/translate")) {
    return {
      service: "Lumen Translate",
      sourceLang: "es",
      targetLang: "en",
      text: "An agent should be able to pay for APIs without a card or an API key.",
      receipt,
    };
  }

  if (url.includes("/polish")) {
    return {
      service: "Copyloom",
      text: "Agents should pay for APIs the way they already call them — no cards, no keys, just USDC per request.",
      receipt,
    };
  }

  if (url.includes("/ideas")) {
    return {
      service: "Sparkline",
      ideas: [
        "A travel agent that nanopays for live visa + weather checks.",
        "A research desk that buys only the papers it cites.",
        "A sales copilot that pays for company briefs on the call.",
        "A local-events scout that buys neighborhood calendars.",
        "A naming studio that pays per domain availability ping.",
      ],
      receipt,
    };
  }

  if (url.includes("social/search")) {
    return {
      service: "Pulse Social",
      query: "Circle USDC",
      posts: [
        {
          handle: "@builder",
          text: "My agent just bought a BTC quote with USDC. No key, no dashboard.",
          likes: 214,
        },
        {
          handle: "@desk",
          text: "x402 + Agent Wallet is the first time a bot can pay an API the same way it calls it.",
          likes: 167,
        },
        {
          handle: "@markets",
          text: "USDC chatter today is all nanopayments, not another stablecoin explainer.",
          likes: 98,
        },
      ],
      asOf: new Date().toISOString(),
      receipt,
    };
  }

  if (url.includes("prediction/odds")) {
    return {
      service: "Bookline / prediction odds",
      question: "Next FOMC decision",
      markets: [
        { title: "Hold", yes: 0.64, venue: "primary" },
        { title: "Cut 25 bps", yes: 0.31, venue: "primary" },
        { title: "Hike", yes: 0.05, venue: "primary" },
      ],
      asOf: new Date().toISOString(),
      receipt,
    };
  }

  if (url.includes("exa.ai")) {
    return {
      results: [
        {
          title: "Agents are paying APIs in USDC",
          url: "https://developers.circle.com/agent-stack",
          text: "An agent hits 402, settles a nanopayment, and gets the data. No key, no seat, no invoice.",
        },
        {
          title: "x402 + Circle Agent Wallet",
          url: "https://developers.circle.com/x402",
          text: "Discovery is public. Inspect, then pay — never pay blind.",
        },
        {
          title: "Gateway batches make sub-cent calls viable",
          url: "https://developers.circle.com/stablecoins/circle-gateway",
          text: "Builders post receipts, not whitepapers.",
        },
      ],
      receipt,
    };
  }

  if (url.includes("/summarize") || url.includes("sonar-pro")) {
    return {
      service: url.includes("sonar-pro") ? "Sonar Pro" : "Nucleus",
      digest:
        "Circle Agent Stack lets an agent hold USDC, discover x402 services, and settle per-request nanopayments — no API keys, no checkout.",
      insights: [
        "Payment is authentication.",
        "Gateway batches make sub-cent calls viable.",
        "Discovery is public — no account required to search.",
      ],
      receipt,
    };
  }

  return {
    ok: true,
    message: "Service executed after x402 nanopayment.",
    resource: url,
    receipt,
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
