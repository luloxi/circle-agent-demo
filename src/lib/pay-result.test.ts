import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chargedUsdcFromPayOutput,
  formatUsdPrice,
  headlineFromQuotes,
  quotesFromPayload,
  searchHitsFromPayload,
  sellerBodyFromPayOutput,
} from "./pay-result";

test("sellerBodyFromPayOutput unwraps CLI data.response", () => {
  const body = sellerBodyFromPayOutput({
    data: {
      response: { items: [{ price: 1 }] },
      payment: { amount: "$0.02 USDC" },
    },
  });
  assert.deepEqual(body, { items: [{ price: 1 }] });
});

test("chargedUsdcFromPayOutput reads $0.02 from CLI payment.amount", () => {
  const amount = chargedUsdcFromPayOutput({
    data: { response: { items: [] }, payment: { amount: "$0.02 USDC" } },
  });
  assert.equal(amount, 0.02);
});

test("quotesFromPayload maps WBTC/WETH to BTC/ETH", () => {
  const quotes = quotesFromPayload({
    items: [
      {
        address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        price: 4512.4,
        open: 4480,
        chain: "ethereum",
      },
      {
        address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        price: 117432.18,
        open: 115800,
        chain: "ethereum",
      },
    ],
  });
  assert.equal(quotes[0].symbol, "BTC");
  assert.equal(quotes[1].symbol, "ETH");
  assert.equal(formatUsdPrice(quotes[0].price), "$117,432");
  assert.match(headlineFromQuotes(quotes), /BTC \$117,432 · ETH \$4,512/);
  assert.ok(quotes[0].change24h != null && quotes[0].change24h > 0);
});

test("searchHitsFromPayload reads Exa results", () => {
  const hits = searchHitsFromPayload({
    data: {
      response: {
        results: [
          { title: "Agents pay APIs", url: "https://example.com", text: "USDC x402" },
        ],
      },
    },
  });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].title, "Agents pay APIs");
});
