# Agent Query Composer

Booth demo of [Circle Agent Stack](https://developers.circle.com/agent-stack) for the **Arc hackathon**.

An agent **decomposes a query**, **prices each Marketplace hop in USDC**, and **pays with x402 nanopayments**. Built as a **buyer** — Agent Wallet + Discovery + `circle services pay`. Not a seller.

**Demo Mode is on by default** (mock wallet, mocked USDC, full happy path). Flip it off to use a real Circle Agent Wallet on **Arc Testnet**.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How to connect everything (live / Arc Testnet)

Do this on the machine that runs `npm run dev` (or a long-lived server). The Circle CLI stores Terms + OTP session on that machine.

### 1. Install

Needs Node.js 20.18.2+. This repo already depends on `@circle-fin/cli`.

```bash
npm install
npx circle --version
```

Optional global install: `npm install -g @circle-fin/cli`. If Next cannot find the binary, set `CIRCLE_CLI_PATH` in `.env.local` (see `.env.example`).

### 2. Accept Terms (once)

The CLI blocks wallet commands until Terms are accepted. The app **never** accepts them for you.

1. Turn **Demo** off in the header.
2. **Connect** → review [Terms of Use](https://agents.circle.com/terms-of-use) and [Privacy Policy](https://www.circle.com/legal/privacy-policy).
3. Check the box → **Accept Terms**.

Terminal equivalent:

```bash
npx circle terms show --output json
npx circle terms accept --output json
```

### 3. Email + OTP

1. Enter the email in the connect dialog → **Send OTP**.
2. Paste the code Circle emails you (`ABC-123456` or the 6 digits).
3. **Verify & connect**. The app lists or creates an Agent Wallet on `ARC-TESTNET`.

```bash
npx circle wallet login you@email.com --type agent --init --testnet
npx circle wallet login --type agent --request <request-id> --otp ABC-123456 --testnet
npx circle wallet status --type agent --output json
npx circle wallet list --chain ARC-TESTNET --type agent --output json
# If empty:
npx circle wallet create --type agent --testnet --output json
```

### 4. Get testnet USDC (empty wallet)

A new wallet shows **0.00**. Stay on **Wallet** and click **Get testnet USDC**. That opens the [Circle faucet](https://faucet.circle.com).

1. Network: **Arc Testnet**
2. Token: **USDC**
3. Paste the wallet address from the card
4. Request tokens → back in the app, hit refresh

CLI faucet (no `--method` / `--amount` on testnet):

```bash
npx circle wallet fund --address 0xYourAgentWallet --chain ARC-TESTNET
npx circle wallet balance --address 0xYourAgentWallet --chain ARC-TESTNET --output json
```

Then run a preset: **Crypto Prices**, **Live Search**, **Social Pulse**, or **Market Odds**.

### 5. Networks in the header

| Selector | CLI `--chain` | Discovery | Funding |
| --- | --- | --- | --- |
| Arc Testnet (default) | `ARC-TESTNET` | `arc-testnet` | Circle faucet |
| Base | `BASE` | `base` | Mainnet — instructions only |

Two USDC pools: on-chain (`circle wallet balance`) for vanilla x402, Gateway (`circle gateway balance`) for nanopayments. Eco Gateway deposits land on **Polygon** → pay with `--chain MATIC`. Do not deposit 100% of vanilla USDC.

---

## Deploy to GitHub + Vercel

Hosted Vercel is the **Demo Mode** booth: presets, marketplace search, and the FAQ. **Live wallet / pay need the Circle CLI session on the server** (Terms + OTP live in `~/.circle-cli`). Serverless functions do not keep that session, so leave Demo on for the public URL.

```bash
# 1. Push the repo
git add .
git commit -m "Agent Query Composer — Arc hackathon demo"
gh repo create circle-agent-demo --public --source=. --remote=origin --push

# 2. Deploy and attach the GitHub repo
vercel --yes --prod
vercel git connect
```

Or import the repo in the [Vercel dashboard](https://vercel.com/new). Framework: Next.js. No env vars required for Demo Mode.

```bash
# Optional: start the hosted app in Demo Mode
vercel env add NEXT_PUBLIC_DEFAULT_DEMO_MODE
# value: true
```

After connect, every push to `main` deploys.

Local live mode stays `npm run dev` on this machine (CLI already logged in).

---

## For agents

Any agent can fetch the buyer skill and pay with **its own** wallet:

```bash
curl -sL https://circle-agent-demo.vercel.app/agent.md
```

Do **not** put your Circle CLI session or OTP in Vercel env vars. That would make every visitor spend your USDC. The hosted site therefore refuses live login / fund / pay. Discovery and Demo Mode stay public.

Local skill: `.agents/skills/use-aqc/SKILL.md`.

---

## Booth walkthrough (Demo Mode)

1. Leave **Demo** on.
2. Click a preset — **Crypto Prices**, **Live Search**, **Social Pulse**, or **Market Odds**.
3. Cost ticket → **Run** → assembled answer on **Done**.
4. **FAQ** in the header is the Arc / Agent Stack explainer.

---

## What talks to what

| UI action | Demo Mode | Live Mode |
| --- | --- | --- |
| Decompose / presets | Local catalog | Discovery API + fixture fallbacks |
| Execute plan | Mocked nanopayments | `circle services pay` per step |
| Search marketplace | Local fixtures | Public Discovery API — no API key |
| Connect wallet | Fixture + 25 USDC | CLI status / list / create |
| Fund wallet | +10 USDC locally | Opens [faucet.circle.com](https://faucet.circle.com) + `circle wallet fund` |
| Single pay | Mocked 200 + JSON | inspect → estimate → pay (`-X` from inspect) |

Discovery:

```
GET https://api.circle.com/v2/x402/discovery/resources
```

This app is a **buyer**. Seller skill (`accept-agent-payments`) is Gateway middleware — not this UI. See [docs/CIRCLE-SKILLS.md](docs/CIRCLE-SKILLS.md).

---

## Circle AI Skills

Pinned from [setup.md](https://agents.circle.com/skills/setup.md) and [`circlefin/skills`](https://github.com/circlefin/skills) under `.agents/skills/`.

| Skill | Role |
| --- | --- |
| `pay-via-agent-wallet` | Buyer path: search → inspect → estimate → pay |
| `use-agent-wallet` | CLI, Terms, OTP, create, status |
| `fund-agent-wallet` | Vanilla USDC vs Gateway |
| `use-circle-cli` | Master CLI |
| `circle-agent-setup` | Official setup: CLI-only wallet, `--chain` |

---

## Project layout

```
src/app/page.tsx                 Composer UI
src/app/faq                      Arc / Agent Stack FAQ
src/app/api/wallet/*             Connect, login, terms, balance, fund
src/app/api/services/*           Discovery, inspect, pay
src/lib/circle-cli.ts            Safe CLI spawn (argv array, never a shell string)
src/lib/composer.ts              Presets + cost plan
.agents/skills/                  Official Circle skills
```

OTPs are not logged.

```bash
npm run dev      # http://localhost:3000
npm run build
npm run start
npm run lint
```

---

## Official docs

- [Agent Stack](https://developers.circle.com/agent-stack)
- [Agent Wallets](https://developers.circle.com/agent-stack/agent-wallets)
- [Agent Marketplace](https://developers.circle.com/agent-stack/agent-marketplace)
- [Discovery API](https://developers.circle.com/agent-stack/agent-marketplace/discovery-api)
- [Circle CLI](https://developers.circle.com/agent-stack/circle-cli)
- [Arc](https://www.arc.io/)
- [Circle faucet](https://faucet.circle.com)
- [Live catalog](https://agents.circle.com/services)

This is a demo, not an official Circle product.
