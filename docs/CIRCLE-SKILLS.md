# Circle AI Skills — how this app maps

This repo is a **buyer** demo. It uses **Circle Agent Wallet CLI only** (`@circle-fin/cli`) — never developer-controlled, user-controlled, or third-party wallets.

Official setup (saved locally): `.agents/skills/circle-agent-setup/`  
Source: https://agents.circle.com/skills/setup.md

Companions:

- https://agents.circle.com/skills/wallet-login.md
- https://agents.circle.com/skills/wallet-fund.md
- https://agents.circle.com/skills/wallet-pay.md
- https://agents.circle.com/skills/discover-services.md

## Official setup sequence (setup.md)

1. `which circle` — install `@circle-fin/cli` if missing
2. Install skills: `npx skills add circlefin/skills` (or `circle skill install --tool <host>`)
3. `circle wallet status` — Terms gate first (live URLs, explicit yes, then `circle terms accept`)
4. Login: `circle wallet login <email> --init` then `--request --otp` (never guess email; never log OTPs)
5. `circle wallet list --chain <CHAIN> --type agent` — `--chain` is **required**. Create if empty.
6. `circle wallet balance` + `circle gateway balance` — two pools
7. Search → inspect + raw 402 → estimate → `pay -X <method>`

## Buyer path (`wallet-pay.md` + `pay-via-agent-wallet`)

1. Fresh marketplace search per new keyword
2. `circle services inspect` **and** raw HTTP 402 `accepts[]` (inspect only shows one accept)
3. Check **both** balance pools, then pick `--chain`
4. Prefer Gateway if that pool already covers the price
5. `--estimate`, then `pay -X <inspect method> --timeout 60 --max-amount <advertised>`
6. `Wallet not deployed` → zero-amount self-transfer, then retry once
7. Never retry after `PAYMENT WAS SUBMITTED`

Gateway-only sellers are first-class. Eco deposit from BASE lands on Polygon → `pay --chain MATIC`. Never deposit 100% of vanilla USDC.

## Wallet (`use-agent-wallet`)

Agent Wallets via `@circle-fin/cli` — not developer-controlled or user-controlled SDK wallets.

- Terms: never accept on the user's behalf
- Login: email + OTP (`--init` / `--request`)
- `--chain` required on list/balance

## Funding (`fund-agent-wallet`)

Two pools:

- **Vanilla** — `circle wallet balance` / `circle wallet fund`
- **Gateway nanopayments** — `circle gateway balance` / `circle gateway deposit`

Eco is the default Gateway path unless the user asks for direct, the source chain is not eco-capable, or the seller does not accept Gateway on Polygon. Do not drain all vanilla USDC into Gateway.

## Seller path (`accept-agent-payments`)

Not implemented as a runtime in this UI. Official default is Circle **Gateway Nanopayments** with `@circle-fin/x402-batching` middleware — not vanilla x402 on Base.

```ts
import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";

const gateway = createGatewayMiddleware({
  sellerAddress: process.env.SELLER_ADDRESS!,
});

app.post("/summarize", gateway.require("$0.01"), async (req, res) => {
  res.json({ summary: "paid result" });
});
```

Marketplace listing is a **submission** (Talk to us / get-listed), not `circle services publish`.

## Safety

- Spawn CLI args as an array (no shell interpolation)
- Validate seller-controlled URL / method / JSON
- `--max-amount` capped to the advertised price
- No retry after `PAYMENT WAS SUBMITTED`
- OTPs are not logged
- `CIRCLE_ACCEPT_TERMS` is never auto-set
- `NODE_OPTIONS=--max-http-header-size=262144` for large x402 headers
