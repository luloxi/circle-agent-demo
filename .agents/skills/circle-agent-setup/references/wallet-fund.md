# Skill: Fund Circle Agent Wallet

**CRITICAL: This skill uses Circle Agent Wallet CLI exclusively. Do NOT use any other wallet outside of Circle Agent Wallet.**

## Balance Types

**On-Chain (Vanilla x402):** USDC in wallet address. Each chain separate. Gas fees per tx. Use for `supportsVanillax402: true`

**Gateway (Circle Gateway):** Off-chain USDC. Separate per chain - NO cross-chain transfer. Batched txs, lower costs. Use for `supportsCircleGateway: true` on specific chain.

## Check First

```bash
# Check wallet
circle wallet list --chain BASE --output json

# Check Gateway balance (use the address from wallet list above)
circle gateway balance --address <addr> --chain BASE --output json
```

## Mainnet Funding

Ask user: "How would you like to fund your wallet?"
1. Fund with fiat (USD) - buy USDC
2. Deposit existing crypto - transfer USDC

### Required flags for agents (non-interactive mode)

The CLI only prompts for missing values when run in an interactive terminal. **Agents are non-interactive**, so every `circle wallet fund` invocation against mainnet MUST include:

- `--address <addr>` — wallet address from `circle wallet list`
- `--chain <chain>` — e.g. `BASE`
- `--method <fiat|crypto>` — without it: `Error: --method is required in non-interactive mode.`
- `--amount <number>` — required; without it: `Error: --amount is required.`

`--token usdc` is the default and can be omitted, but pass it explicitly when the user asked for USDC specifically.

### Option 1: Fiat On-Ramp

Opens a Transak purchase window. Funds deposit directly to the wallet.

```bash
# Recommended: open Transak in the user's browser
circle wallet fund --address <addr> --chain BASE --amount 10 --token usdc --method fiat --open

# Alternative: print the Transak URL only (no browser launch)
circle wallet fund --address <addr> --chain BASE --amount 10 --token usdc --method fiat --no-open
```

### Option 2: Deposit Existing USDC

Ask the user's USDC chain location. Default to BASE if unsure.

**Recommended — browser-rendered QR (best UX):**

```bash
circle wallet fund --address <addr> --chain BASE --amount 10 --token usdc --method crypto --open
```

`--open` renders the EIP-681 QR on a local HTML page in the user's default browser. Use this by default. Terminal-rendered QR codes are frequently truncated or unscannable inside agent UIs (Claude Code, Codex, etc.); the browser page renders the QR at full resolution and works on both desktop and mobile.

The user scans the QR with any mobile wallet (MetaMask, Coinbase Wallet, Rainbow, etc.) and confirms the transfer.

**Alternative — save the QR as a PNG file:**

```bash
circle wallet fund --address <addr> --chain BASE --amount 10 --token usdc --method crypto --export ~/Downloads
```

**Alternative — manual transfer (no QR):**

```bash
circle wallet list --chain BASE --output json  # Get address
```

Provide the user: address, token (USDC), network (BASE), USDC contract `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, chain ID 8453.

**Verify after transfer:**

```bash
circle wallet balance --address <addr> --chain BASE --output json
```

## Gateway Deposit (Advanced)

Only suggest if: user has on-chain USDC, wants lower tx costs, AND verified service supports Gateway on destination chain.

### Eco Deposit: BASE → Polygon Settlement

**CRITICAL:** Eco deposit from BASE settles on Polygon, NOT BASE.

```bash
# Deposit from BASE (settles on Polygon)
circle gateway deposit --amount 10 --chain BASE --method eco

# Verify (will show Polygon balance in the per-chain breakdown)
circle gateway balance --address <addr> --chain BASE --output json

# Deploy wallet on Polygon
circle wallet transfer <addr> --amount 0 --address <addr> --chain MATIC --token usdc

# Pay using Polygon
circle services pay "<url>" --chain MATIC
```

**Common mistake:** Using `--chain BASE` when balance is on Polygon = fails

**BEFORE eco deposit:** Verify target services support Gateway on Polygon (eip155:137) via discovery API. Many services only broadcast on BASE (example: Alchemy).

### Direct Deposit (Alternative)

Slower but deposits on same chain as source.

```bash
circle gateway deposit --amount <amount> --address <addr> --chain MATIC --method direct
```

Supported chains: BASE, MATIC, ETH, ARB, AVAX, OP, UNI

## Troubleshooting

**`Error: --method is required in non-interactive mode. Use --method fiat or --method crypto.`** → Agent forgot `--method`. Re-run with `--method fiat` or `--method crypto` (see "Required flags for agents" above).

**`Error: --amount is required.`** → `circle wallet fund` needs `--amount <number>` (USDC amount). Re-run with `--amount 10` (or whatever the user requested).

**Terminal QR is truncated or unscannable inside the agent UI** → Re-run the crypto-funding command with `--open` (browser-rendered QR) or `--export ~/Downloads` (saves a PNG).

**"Wallet not deployed"** → Deploy on payment chain: `circle wallet transfer <addr> --amount 0 --address <addr> --chain MATIC --token usdc`

**"Insufficient balance"** → Check both balance types, verify correct chain

**Payment signs on wrong chain** → Match `--chain` to balance location:
- Gateway on Polygon → `--chain MATIC`
- Gateway on BASE → `--chain BASE`
- On-chain BASE → `--chain BASE`

**Legacy Eco intent expired, is `WaitingForRefund`, or funds landed at `eoaOwnerAddress`** → Stop funding and follow the legacy recovery skill: `curl -sL https://agents.circle.com/skills/recover-eco-funds.md`. Verify the onchain fixed refund recipient before using any executable recovery phase. Current Gateway v2 deposits set `refundRecipient` to the SCA; use normal status and balance reconciliation for those deposits instead.

## Which Path to Choose?

**Most users:** Deposit existing crypto (Option 2) - fastest, maximum compatibility

**Advanced users:** Gateway eco deposit - ONLY if verified service support on Polygon AND need lower costs

**Recommendation:** Start with Option 2. Many services only support mainnet primary network.

## Next Steps

After funding:
1. Verify balance: `circle wallet balance` (on-chain USDC) or `circle gateway balance --address <addr> --chain BASE` (Gateway USDC)
2. Deploy wallet on payment chain if using Gateway: `circle wallet transfer <addr> --amount 0 --address <addr> --chain MATIC --token usdc`
3. Discover services: `curl -sL https://agents.circle.com/skills/discover-services.md`
4. Pay for services: `curl -sL https://agents.circle.com/skills/wallet-pay.md`

## Security

- Never share private keys
- USDC is real money - start with small amounts
- Eco deposits settle on Polygon - remember when managing balances

## Rules

- NEVER prompt users to send USDC to generated addresses
- ALWAYS use user's own wallet from `circle wallet list`
- NEVER store/log private keys
- Always abstract chains from users unless technical detail needed
- Ask user funding preference (fiat vs crypto)
- For crypto: ask source chain to determine if bridge needed
- ALWAYS pass `--method <fiat|crypto>` to `circle wallet fund` — agents are non-interactive and the CLI will not prompt
- ALWAYS pass `--amount <number>` to `circle wallet fund` — confirm the amount with the user first
- ALWAYS prefer `--method crypto --open` over rendering QR codes in the terminal — terminal QR codes get truncated inside Claude Code, Codex, and similar agent UIs and become unscannable
- For fiat: use `--method fiat --open` so Transak loads in the browser; use `--no-open` only if the user explicitly asked for the URL without launching a browser
- NEVER suggest eco deposit unless verified service support on Polygon
- ALWAYS use `--chain` matching balance location
- ALWAYS deploy wallet on payment chain before first tx
- Gateway does NOT do cross-chain transfers
- Services must broadcast on chain where Gateway balance is
- BEFORE eco deposit: verify service support on Polygon via discovery API with `network=eip155:137`
- ALWAYS route expired, `WaitingForRefund`, or backing-EOA Eco cases to the recovery skill before attempting another deposit

---

**Current location**: `/skills/wallet-fund.md`

**For full skill directory**: Read https://agents.circle.com/.well-known/agent-skills/index.json to see all available skills and navigate between them.
