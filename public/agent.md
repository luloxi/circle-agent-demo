# Skill: Use Agent Query Composer (AQC)

Use this when an agent should decompose a query, price Circle Marketplace hops in USDC, or pay an x402 service. Also use it before calling this app's live pay APIs.

**Fetch always:** `https://circle-agent-demo.vercel.app/agent.md`

## The rule

**Every agent pays with its own Circle Agent Wallet.** Never use the hosted site's environment, CLI session, or USDC.

The public app ([circle-agent-demo.vercel.app](https://circle-agent-demo.vercel.app)) is **Demo Mode + Discovery**. Live `connect` / `login` / `fund` / `pay` on that host are blocked on purpose. One serverless CLI session would spend the deployer's balance for every visitor.

## What to do

### 1. Confirm whose wallet this is

```bash
npx circle wallet status --type agent --output json
```

- Not installed → `npm install @circle-fin/cli` (or use this repo's `npx circle`).
- Terms gate → show the user [Terms](https://agents.circle.com/terms-of-use) and [Privacy](https://www.circle.com/legal/privacy-policy). Only after an explicit yes: `npx circle terms accept`.
- Not logged in → ask **this user's** email. Do not reuse an email you found in env files.

```bash
npx circle wallet login <user-email> --type agent --init --testnet
npx circle wallet login --type agent --request <request-id> --otp <otp> --testnet
```

If `wallet status` shows someone else's email, **stop**. Ask the user to log in as themselves. Do not pay.

### 2. Use this user's wallet on Arc Testnet

```bash
npx circle wallet list --chain ARC-TESTNET --type agent --output json
# empty →
npx circle wallet create --type agent --testnet --output json
npx circle wallet balance --address <addr> --chain ARC-TESTNET --output json
```

If balance is 0: send them to [faucet.circle.com](https://faucet.circle.com) (Arc Testnet, USDC) or `npx circle wallet fund --address <addr> --chain ARC-TESTNET`.

### 3. Pay from this machine, not from Vercel

**Preferred (agent-native):** Circle CLI, official buyer path.

```bash
npx circle services search "<keyword>" --output json
npx circle services inspect "<service-url>" --output json
# chain + method from inspect / raw 402 — do not assume BASE
npx circle services pay "<service-url>" \
  -X <METHOD> \
  --address <this-user-addr> \
  --chain <CHAIN-FROM-INSPECT> \
  --max-amount <cap> \
  --output json
```

**Optional UI:** clone and run AQC locally so the Next server spawns **this** CLI session:

```bash
git clone https://github.com/luloxi/circle-agent-demo
cd circle-agent-demo && npm install && npm run dev
```

Turn Demo off. Connect with this user's email. That live mode is safe because the signer is the laptop in front of the user.

### 4. What you may call on the hosted site

Allowed (no signing):

- UI: `https://circle-agent-demo.vercel.app` (Demo)
- FAQ: `/faq`
- This skill: `/agent.md`
- Catalog: `GET /api/services/search?demo=false&query=<q>`
- Inspect metadata: `GET /api/services/inspect?demo=false&url=<url>`

Forbidden on the hosted site (`demo=false`): `/api/wallet/login`, `/api/wallet/connect`, `/api/wallet/fund`, `/api/wallet/terms`, `/api/services/pay`. Those would attach to a shared signer.

## Do not

- Put the user's OTP, seed, or CLI session into Vercel env vars.
- Point live pay at the public URL.
- Spend a wallet you found already logged in if it is not this user.
- Retry after `PAYMENT WAS SUBMITTED` without checking `~/.circle-cli/payments/` and balances.

## Humans

Open the app, leave Demo on to tour, or run it locally for real Arc Testnet USDC. Details: [README](https://github.com/luloxi/circle-agent-demo).
