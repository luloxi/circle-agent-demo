import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decomposePreset,
  filterLiveCatalog,
  isMockMarketplaceHost,
  listingAcceptsChain,
  pickListing,
  resolvePayRequest,
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
