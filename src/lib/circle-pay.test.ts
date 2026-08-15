import assert from "node:assert/strict";
import { test } from "node:test";
import { gatewayNeedsLoad, pickPayChain, planEcoOnboard, sizeEcoDeposit } from "./circle-chains";
import { isSafeHttpUrl, preferredPayMethod } from "./circle-safety";
import {
  acceptsFromInspectSummary,
  parsePaymentRequired,
} from "./circle-x402";
import type { PaymentAcceptance } from "./types";

const GW_BASE: PaymentAcceptance = {
  scheme: "exact",
  network: "eip155:8453",
  asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  amount: "8000",
  payTo: "0xBd7b9f3e0CD3E1f6e698D0eeBb99F96E093BdeE3",
  extra: { name: "GatewayWalletBatched" },
};
const GW_MATIC: PaymentAcceptance = {
  ...GW_BASE,
  network: "eip155:137",
  asset: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
};
const VANILLA_BASE: PaymentAcceptance = {
  scheme: "exact",
  network: "eip155:8453",
  asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  amount: "8000",
  payTo: "0xBd7b9f3e0CD3E1f6e698D0eeBb99F96E093BdeE3",
  extra: { name: "USD Coin" },
};

test("parsePaymentRequired reads base64 PAYMENT-REQUIRED accepts", () => {
  const payload = Buffer.from(
    JSON.stringify({ accepts: [GW_BASE, GW_MATIC] }),
    "utf8",
  ).toString("base64");
  const accepts = parsePaymentRequired(payload);
  assert.equal(accepts.length, 2);
  assert.equal(accepts[1].network, "eip155:137");
  assert.equal(accepts[0].extra?.name, "GatewayWalletBatched");
});

test("acceptsFromInspectSummary expands Gateway chains including Polygon", () => {
  const accepts = acceptsFromInspectSummary({
    scheme: "GatewayWalletBatched",
    seller: GW_BASE.payTo,
    chains: ["eip155:8453", "eip155:137"],
  });
  assert.equal(accepts.length, 2);
  assert.equal(accepts[1].network, "eip155:137");
  assert.equal(accepts[0].extra?.name, "GatewayWalletBatched");
});

test("pickPayChain prefers BASE vanilla over MATIC Gateway when both are funded", () => {
  const picked = pickPayChain(
    [GW_MATIC, VANILLA_BASE],
    "BASE",
    [
      { chain: "BASE", vanilla: 1, gateway: 0 },
      { chain: "MATIC", vanilla: 0, gateway: 1 },
    ],
    0.008,
    "mainnet",
  );
  assert.ok(picked);
  assert.equal(picked.chain, "BASE");
  assert.equal(picked.gateway, false);
});

test("pickPayChain with only BASE vanilla does not mark Gateway as ready", () => {
  const picked = pickPayChain(
    [GW_BASE, GW_MATIC, VANILLA_BASE],
    "BASE",
    [{ chain: "BASE", vanilla: 1, gateway: 0 }],
    0.008,
    "mainnet",
  );
  assert.ok(picked);
  assert.equal(picked.chain, "BASE");
  assert.equal(picked.gateway, false);
});

test("planEcoOnboard deposits BASE vanilla to pay MATIC when Gateway is empty", () => {
  const plan = planEcoOnboard(
    [GW_BASE, GW_MATIC],
    [{ chain: "BASE", vanilla: 1, gateway: 0 }],
    0.008,
    "mainnet",
  );
  assert.ok(plan);
  assert.equal(plan.depositChain, "BASE");
  assert.equal(plan.payChain, "MATIC");
  assert.equal(plan.amount, 0.5);
});

test("planEcoOnboard is skipped when Gateway is already funded", () => {
  const plan = planEcoOnboard(
    [GW_BASE, GW_MATIC],
    [{ chain: "MATIC", vanilla: 0, gateway: 0.5 }],
    0.008,
    "mainnet",
  );
  assert.equal(plan, null);
});

test("sizeEcoDeposit uses the 0.5 USDC Gateway minimum", () => {
  assert.equal(sizeEcoDeposit(0.08, 0.008), null);
  assert.equal(sizeEcoDeposit(0.5, 0.008), null);
  assert.equal(sizeEcoDeposit(1, 0.008), 0.5);
});

test("isSafeHttpUrl allows multi-param GET resources", () => {
  assert.equal(
    isSafeHttpUrl("https://api.aisa.one/apis/v2/polymarket/events?limit=8&status=open"),
    true,
  );
  assert.equal(
    isSafeHttpUrl("https://api.aisa.one/apis/v2/coingecko/simple/price?ids=bitcoin,ethereum&vs_currencies=usd"),
    true,
  );
});

test("preferredPayMethod keeps POST from the composer over inspect GET", () => {
  assert.equal(preferredPayMethod("POST", "GET"), "POST");
  assert.equal(preferredPayMethod(undefined, "GET"), "GET");
  assert.equal(preferredPayMethod("POST", undefined), "POST");
});

test("gatewayNeedsLoad is about payable balance, not the 0.5 deposit floor", () => {
  assert.equal(gatewayNeedsLoad(null), true);
  assert.equal(gatewayNeedsLoad(0), true);
  assert.equal(gatewayNeedsLoad(0.44, 0.016), false);
  assert.equal(gatewayNeedsLoad(0.008, 0.016), true);
});
