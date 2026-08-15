import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assemblePlan,
  decomposePreset,
  decomposePrompt,
  excerptFromResult,
  filterLiveCatalog,
  isMockMarketplaceHost,
  listingAcceptsChain,
  pickListing,
  resolvePayRequest,
  selectLiveRoles,
  type PresetRole,
} from "./composer";
import { MOCK_SERVICES } from "./mock-data";
import { searchRequestForMode } from "./networks";
import type { ServiceListing } from "./types";

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_ARC = "0x3600000000000000000000000000000000000000";
const SELLER = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";

function listing(
  resource: string,
  networks: string[],
  extra?: { name?: string; tags?: string[]; description?: string },
): ServiceListing {
  return {
    resource,
    type: "http",
    x402Version: 2,
    accepts: networks.map((network) => ({
      scheme: "exact",
      network,
      asset: network === "eip155:8453" ? USDC_BASE : USDC_ARC,
      amount: "10000",
      payTo: SELLER,
    })),
    metadata: {
      provider: {
        name: extra?.name ?? "Fixture",
        description: extra?.description ?? extra?.name ?? "fixture",
        tags: extra?.tags,
      },
      description: extra?.description,
    },
  };
}

const BASE_PRICES = listing("https://api.aisa.one/apis/v2/coingecko/simple/price", ["eip155:8453"], {
  name: "CoinGecko",
  tags: ["price", "crypto", "token"],
  description: "Spot crypto prices",
});
const BASE_SEARCH = listing("https://api.aisa.one/apis/v2/perplexity/sonar", ["eip155:8453"], {
  name: "Sonar",
  tags: ["search", "research"],
  description: "Web search",
});
const ARC_ONLY = listing("https://np.orthogonal.com/precip/api/v1/hourly", ["eip155:5042002"], {
  name: "Orthogonal",
  tags: ["weather"],
  description: "Hourly weather",
});
const MOCK_BASE = listing("https://api.example-agents.dev/v1/social/search", ["eip155:8453"], {
  name: "Pulse Social",
  tags: ["twitter", "social", "posts"],
  description: "Recent posts",
});
const MIXED_CATALOG = [MOCK_BASE, ARC_ONLY, BASE_PRICES, BASE_SEARCH];

const PRICE_ROLE: PresetRole = {
  title: "Spot prices",
  intent: "Latest BTC and ETH quotes",
  role: "prices",
  keywords: ["price", "token", "allium"],
  fallbackUrl: "https://agents.allium.so/api/v1/developer/prices",
};

test("filterLiveCatalog keeps BASE-accepting real hosts only", () => {
  const filtered = filterLiveCatalog(MIXED_CATALOG, "BASE");
  const resources = filtered.map((item) => item.resource);
  assert.ok(resources.includes(BASE_PRICES.resource));
  assert.ok(resources.includes(BASE_SEARCH.resource));
  assert.ok(resources.includes("https://api.exa.ai/search"));
  assert.ok(!resources.some((url) => url.includes("example-agents.dev")));
  for (const item of filtered) {
    assert.equal(listingAcceptsChain(item, "BASE"), true);
    assert.equal(isMockMarketplaceHost(item.resource), false);
  }
});

test("pickListing with BASE live prefers a BASE listing and skips mock hosts", () => {
  const picked = pickListing(MIXED_CATALOG, PRICE_ROLE, "BASE", true);
  assert.equal(listingAcceptsChain(picked, "BASE"), true);
  assert.equal(isMockMarketplaceHost(picked.resource), false);
  assert.equal(picked.resource, BASE_PRICES.resource);
});

test("pickListing live never selects example-agents.dev even when it accepts BASE", () => {
  const picked = pickListing([MOCK_BASE, ARC_ONLY], PRICE_ROLE, "BASE", true);
  assert.equal(isMockMarketplaceHost(picked.resource), false);
  assert.notEqual(picked.resource, MOCK_BASE.resource);
});

test("demo decomposePreset prices without a live chain picks a prices listing", () => {
  const plan = decomposePreset("prices", MOCK_SERVICES);
  assert.ok(plan);
  assert.ok(plan.steps.length > 0);
  const prices = plan.steps[0];
  assert.match(prices.listing.resource, /coingecko|\/prices|allium/i);
  assert.doesNotMatch(prices.listing.resource, /example-agents\.dev\/v1\/events/);
});

test("pickListing live prefers Allium prices over AIsa CoinGecko", () => {
  const allium = listing(
    "https://agents.allium.so/api/v1/developer/prices",
    ["eip155:8453"],
    { name: "Allium", tags: ["price", "token", "allium"] },
  );
  const picked = pickListing([BASE_PRICES, allium], PRICE_ROLE, "BASE", true);
  assert.equal(picked.resource, allium.resource);
});

test("resolvePayRequest uses Allium POST for prices", () => {
  const req = resolvePayRequest(BASE_PRICES, { role: "prices" });
  assert.equal(req.method, "POST");
  assert.match(req.url, /allium\.so/);
  const body = JSON.parse(req.data ?? "[]");
  assert.ok(Array.isArray(body));
  assert.equal(body[0].chain, "ethereum");
});

test("live suggested presets keep two payable hops; custom stays one", () => {
  const prices = decomposePreset("prices", MOCK_SERVICES, "BASE", true);
  assert.ok(prices);
  assert.equal(prices.steps.length, 2);
  assert.match(prices.steps[0].listing.resource, /allium\.so/);
  assert.match(prices.steps[1].listing.resource, /exa\.ai/);

  const search = decomposePreset("search", MOCK_SERVICES, "BASE", true);
  assert.ok(search);
  assert.equal(search.steps.length, 2);
  assert.equal(search.steps[1].role, "context");
  for (const step of search.steps) {
    assert.equal(isMockMarketplaceHost(step.listing.resource), false);
  }

  const custom = decomposePrompt("Get the current price of Bitcoin and Ethereum.", MOCK_SERVICES, "BASE", true);
  assert.equal(custom.steps.length, 1);
  assert.match(custom.steps[0].listing.resource, /allium\.so/);

  const demoSearch = decomposePreset("search", MOCK_SERVICES);
  assert.ok(demoSearch);
  assert.equal(demoSearch.steps.length, 2);
  assert.equal(demoSearch.steps[1].role, "summarize");
});

test("resolvePayRequest context hop uses the follow-up query, not the plan prompt", () => {
  const req = resolvePayRequest(
    listing("https://api.exa.ai/search", ["eip155:8453"], { name: "Exa", tags: ["exa"] }),
    {
      role: "context",
      prompt: "Get the current price of Bitcoin and Ethereum.",
      query: "What moved Bitcoin and Ethereum today",
    },
  );
  const body = JSON.parse(req.data ?? "{}");
  assert.match(body.query, /moved Bitcoin/);
  assert.doesNotMatch(body.query, /Get the current price/);
});

test("selectLiveRoles does not invent a second hop for composer", () => {
  const roles = selectLiveRoles(PRESET_SEARCH_ROLES, {
    live: true,
    source: "composer",
    presetId: "search",
  });
  assert.equal(roles.length, 1);
});

const PRESET_SEARCH_ROLES: PresetRole[] = [
  {
    title: "Web search",
    intent: "Find current sources",
    role: "search",
    keywords: ["exa", "search"],
    fallbackUrl: "https://api.exa.ai/search",
  },
  {
    title: "Digest",
    intent: "Compress findings",
    role: "summarize",
    keywords: ["summarize"],
    fallbackUrl: "https://api.example-agents.dev/v1/summarize",
  },
];

test("resolvePayRequest uses Exa POST for live search", () => {
  const exa = listing("https://api.exa.ai/search", ["eip155:8453"], {
    name: "Exa",
    tags: ["exa", "search"],
  });
  const req = resolvePayRequest(exa, {
    role: "search",
    prompt: "latest USDC agent payments",
  });
  assert.equal(req.method, "POST");
  assert.equal(req.url, "https://api.exa.ai/search");
  const body = JSON.parse(req.data ?? "{}");
  assert.match(body.query, /USDC/);
});

test("pickListing live prefers Exa over AIsa Sonar", () => {
  const sonar = listing(
    "https://api.aisa.one/apis/v2/perplexity/sonar",
    ["eip155:8453"],
    { name: "Sonar", tags: ["search", "sonar"] },
  );
  const exa = listing("https://api.exa.ai/search", ["eip155:8453"], {
    name: "Exa",
    tags: ["exa", "search"],
  });
  const role: PresetRole = {
    title: "Web search",
    intent: "search",
    role: "search",
    keywords: ["exa", "search"],
    fallbackUrl: exa.resource,
  };
  const picked = pickListing([sonar, exa], role, "BASE", true);
  assert.equal(picked.resource, exa.resource);
});

test("searchRequestForMode passes the next chain, not the leftover demo network", () => {
  assert.deepEqual(searchRequestForMode("BASE", "ARC-TESTNET"), {
    demo: false,
    chain: "BASE",
  });
  assert.deepEqual(searchRequestForMode("demo", "ARC-TESTNET"), {
    demo: true,
    chain: "ARC-TESTNET",
  });
});

const ALLIUM_ITEMS = {
  items: [
    {
      timestamp: "2026-08-15T22:03:43Z",
      chain: "ethereum",
      address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      decimals: 8,
      price: 117432.18,
      open: 115800,
      close: 117432.18,
    },
    {
      timestamp: "2026-08-15T22:03:43Z",
      chain: "ethereum",
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      decimals: 18,
      price: 4512.4,
      open: 4480,
      close: 4512.4,
    },
  ],
};

test("assemblePlan uses Allium items, never the $111,240 fixture", () => {
  const plan = decomposePreset("prices", MOCK_SERVICES);
  assert.ok(plan);
  plan.steps[0] = {
    ...plan.steps[0],
    status: "completed",
    result: ALLIUM_ITEMS,
    excerpt: excerptFromResult(ALLIUM_ITEMS),
  };
  const assembled = assemblePlan(plan);
  assert.match(assembled.headline, /BTC \$117,432/);
  assert.match(assembled.headline, /ETH \$4,512/);
  assert.doesNotMatch(assembled.headline, /111,240/);
  assert.doesNotMatch(assembled.summary, /Both majors are green/);
});

test("assemblePlan unwraps Circle CLI { data: { response } } envelope", () => {
  const plan = decomposePreset("prices", MOCK_SERVICES);
  assert.ok(plan);
  plan.steps[0] = {
    ...plan.steps[0],
    status: "completed",
    result: { data: { response: ALLIUM_ITEMS, payment: { amount: "$0.02 USDC" } } },
  };
  const assembled = assemblePlan(plan);
  assert.match(assembled.headline, /BTC \$117,432/);
  assert.equal(excerptFromResult(plan.steps[0].result), assembled.headline);
});

test("assemblePlan after a failed pay does not invent spot prices", () => {
  const plan = decomposePreset("prices", MOCK_SERVICES);
  assert.ok(plan);
  plan.steps[0] = { ...plan.steps[0], status: "error", error: "422 schema" };
  const assembled = assemblePlan(plan);
  assert.doesNotMatch(assembled.headline, /111,240/);
  assert.match(assembled.summary, /mock quote/i);
});
