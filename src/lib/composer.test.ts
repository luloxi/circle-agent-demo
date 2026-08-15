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
  keywords: ["price", "market", "coingecko", "crypto", "token"],
  fallbackUrl: "https://api.aisa.one/apis/v2/coingecko/simple/price",
};

test("filterLiveCatalog keeps BASE-accepting real hosts only", () => {
  const filtered = filterLiveCatalog(MIXED_CATALOG, "BASE");
  assert.deepEqual(
    filtered.map((item) => item.resource).sort(),
    [BASE_PRICES.resource, BASE_SEARCH.resource].sort(),
  );
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
  assert.match(prices.listing.resource, /coingecko|\/prices/i);
  assert.doesNotMatch(prices.listing.resource, /example-agents\.dev\/v1\/events/);
});

test("pickListing live prefers concrete CoinGecko price over token_price/{id}", () => {
  const templated = listing(
    "https://api.aisa.one/apis/v2/coingecko/simple/token_price/{id}",
    ["eip155:8453"],
    { name: "CoinGecko token", tags: ["price", "crypto", "token"] },
  );
  const picked = pickListing([templated, BASE_PRICES], PRICE_ROLE, "BASE", true);
  assert.equal(picked.resource, BASE_PRICES.resource);
});

test("resolvePayRequest adds CoinGecko ids and vs_currencies", () => {
  const req = resolvePayRequest(BASE_PRICES, { role: "prices" });
  assert.equal(req.method, "GET");
  assert.match(req.url, /ids=bitcoin/);
  assert.match(req.url, /vs_currencies=usd/);
});

test("resolvePayRequest uses GET YouTube search with engine+q", () => {
  const yt = listing(
    "https://api.aisa.one/apis/v2/youtube/search",
    ["eip155:8453"],
    { name: "YouTube", tags: ["youtube", "search"] },
  );
  const req = resolvePayRequest(yt, {
    role: "search",
    prompt: "latest USDC agent payments",
  });
  assert.equal(req.method, "GET");
  assert.match(req.url, /\/youtube\/search/);
  assert.match(req.url, /engine=youtube/);
  assert.match(req.url, /q=latest/);
  assert.equal(req.data, undefined);
});

test("pickListing live prefers YouTube GET over Sonar POST", () => {
  const sonar = listing(
    "https://api.aisa.one/apis/v2/perplexity/sonar",
    ["eip155:8453"],
    { name: "Sonar", tags: ["search", "sonar"] },
  );
  const yt = listing(
    "https://api.aisa.one/apis/v2/youtube/search",
    ["eip155:8453"],
    { name: "YouTube", tags: ["youtube", "search"] },
  );
  const role: PresetRole = {
    title: "Web search",
    intent: "search",
    role: "search",
    keywords: ["youtube", "search"],
    fallbackUrl: yt.resource,
  };
  const picked = pickListing([sonar, yt], role, "BASE", true);
  assert.equal(picked.resource, yt.resource);
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
