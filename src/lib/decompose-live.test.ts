import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decomposeLive,
  isMockMarketplaceHost,
  listingAcceptsChain,
} from "./composer";
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

const CATALOG: ServiceListing[] = [
  listing("https://api.example-agents.dev/v1/summarize", ["eip155:8453"], {
    name: "Nucleus",
    tags: ["summarize", "digest"],
  }),
  listing("https://np.orthogonal.com/precip/api/v1/hourly", ["eip155:5042002"], {
    name: "Orthogonal",
    tags: ["weather"],
  }),
  listing("https://api.aisa.one/apis/v2/coingecko/simple/price", ["eip155:8453"], {
    name: "CoinGecko",
    tags: ["price", "crypto", "token", "market"],
    description: "Spot crypto prices",
  }),
  listing("https://api.aisa.one/apis/v2/perplexity/sonar", ["eip155:8453"], {
    name: "Sonar",
    tags: ["search", "research", "sonar"],
    description: "Web search",
  }),
];

const BASE_NETWORK = {
  label: "Base",
  shortLabel: "Base Mainnet",
  caip2: "eip155:8453",
  marketplaceLive: true,
};

test("decomposeLive on BASE binds every step to a BASE-accepting real host", () => {
  const plan = decomposeLive({
    presetId: "prices",
    catalog: CATALOG,
    chain: "BASE",
    network: BASE_NETWORK,
  });
  assert.ok(plan);
  assert.ok(plan.steps.length > 0, "expected a priced plan, not an empty catalog");
  for (const step of plan.steps) {
    assert.equal(listingAcceptsChain(step.listing, "BASE"), true, step.listing.resource);
    assert.equal(isMockMarketplaceHost(step.listing.resource), false, step.listing.resource);
    for (const alt of step.alternatives) {
      assert.equal(listingAcceptsChain(alt.listing, "BASE"), true, alt.listing.resource);
      assert.equal(isMockMarketplaceHost(alt.listing.resource), false, alt.listing.resource);
    }
  }
});

test("decomposeLive on BASE with only Arc/mock fixtures returns an empty plan", () => {
  const plan = decomposeLive({
    prompt: "Get the current price of Bitcoin and Ethereum.",
    catalog: CATALOG.filter(
      (item) =>
        item.resource.includes("example-agents.dev") ||
        item.resource.includes("orthogonal.com"),
    ),
    chain: "BASE",
    network: BASE_NETWORK,
  });
  assert.ok(plan);
  assert.equal(plan.steps.length, 0);
  assert.match(plan.title, /Base Mainnet/i);
  assert.match(plan.note ?? "", /eip155:8453/);
});
