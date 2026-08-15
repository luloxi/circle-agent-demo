# Skill: Pay for x402 Services

**CRITICAL: This skill uses Circle Agent Wallet CLI exclusively. Do NOT use any other wallet outside of Circle Agent Wallet.**

## Goal

Unblock the user fast. The user asked for a result; the payment is plumbing. Pick the path with the shortest time-to-result and hide chain/scheme complexity from the user. Surface a question only when there is a genuine fork (no cheap path exists, or cost exceeds the user's stated cap).

## Rules

- ALWAYS run `circle services inspect "<url>" --output json` and read the **raw 402** `accepts[]` (`circle services inspect` summarises only the auto-selected accept). Use `curl -s "<url>"` if needed to see all schemes.
- ALWAYS pass `-X <method>` explicitly to `circle services pay`, using the `method` field from `circle services inspect` output. The CLI defaults to POST when `--data` is present. If the seller only accepts GET, omitting `-X` causes a 405 rejection **after** payment settles on-chain — burning funds for zero data.
- ALWAYS check both balance pools (`circle wallet balance` per chain, `circle gateway balance --chain <CHAIN>`) before choosing `--chain`.
- ALWAYS prefer Gateway when the user **already has Gateway balance ≥ price** on a chain the seller accepts. Gateway transfers are <500ms regardless of source-chain finality. Once a wallet is Gateway-funded, every paid call is instant.
- ALWAYS treat the **first paid call on a fresh wallet as wallet onboarding**, not as a one-shot transaction. Agentic workflows are almost never single-call. Set the wallet up so every future call is fast. If any task-fit seller you intend to call accepts Polygon Gateway, default to `gateway deposit --chain BASE --method eco` first (`~30-50s`, $0.03 flat fee), then pay Gateway-capable calls via Gateway on `--chain MATIC` and any vanilla-only sellers via vanilla on a chain they accept (bridging if needed). Do not pick vanilla for a Gateway-capable seller just because it's cheaper for the first call. The deposit handles wallet setup and amortizes its $0.03 fee instead of paying ~2s/call forever; immediate wins are Gateway-only seller access and future-workflow UX (every subsequent call <500ms).
- Vanilla x402 is the right path **only** when (a) every seller the user needs is vanilla-only on a chain the user already has vanilla on, (b) the user explicitly said "one-shot, no setup", or (c) the user has no BASE/BASE-SEPOLIA vanilla at all and would have to bridge to do an eco deposit. Otherwise, vanilla forces ~2s per call forever and locks the wallet out of Gateway-only sellers.
- If `inspect` or `pay` returns **HTTP 401/403 or status `unavailable`** (an auth rejection, NOT a 402 payment challenge), do NOT treat the endpoint as dead or jump to another provider. Some sellers gate the x402 challenge behind a required request header. Re-read the discovery record's `description` (and `requiredHeaders`, when present) from `circle services search`/`inspect`, then retry with that header via `-H "<Header>: <value>"` — e.g. vaults.fyi needs `-H "x-402-auth: true"` before it returns a 402. Only fall back to another provider if no required header is documented and the header retry still fails.
- If a paid call fails (HTTP error, timeout, fetch failed), retry once. If the retry fails, search for another provider via `circle services search`. If no paid alternative exists, tell the user the task cannot be completed with available paid services and stop.
- NEVER deposit 100% of the user's vanilla balance into Gateway. The wallet needs vanilla headroom for vanilla-only sellers the user may hit next. "Don't deposit everything" is not the same as "don't deposit at all." (See "Pre-deposit guidance" for the sizing formula.)
- For Gateway top-ups, **use `gateway deposit --method eco` unless one of these holds**: (a) the user explicitly asked for `--method direct`, (b) the source chain isn't BASE (eco only supports BASE source today), (c) no task-fit seller you intend to call accepts Polygon Gateway, or (d) the user already has vanilla on a fast chain a seller accepts. Picking direct on BASE outside these conditions costs the user 13-19 minutes of finality wait + gas. Eco is ~30-50s and $0.03 flat.
- Use `circle bridge transfer` (CCTP, ~8-20s, no destination gas needed for SCAs) when chains don't match. No swap step is required — Circle SCAs are paymaster-funded.
- The first vanilla x402 pay on a fresh agent SCA wallet triggers a one-time SCA deployment. The CLI returns `Wallet not deployed` and prompts for a zero-amount self-transfer. If you reach this state, run `circle wallet transfer <addr> --amount 0 --address <addr> --chain <CHAIN> --token usdc` and retry the pay. This is one of the reasons to prefer eco-then-Gateway: the deposit handles SCA setup as part of the deposit flow.
- For any unfamiliar command, run `<cmd> --help` to see flags and output format. Do not guess.
- For SIWX endpoints (browser auth) — automatically filtered out of CLI flows; ignore them.

## Key principles

- **Time-to-result is the metric.** "Cheapest" or "most general-purpose" path is irrelevant if it's slower than an alternative that works.
- **Gateway on fast chain = instant (<500ms) once balance exists.** Gateway on slow chain = same speed, but **getting balance there** waits for finality (~13-19 min on BASE/ETH/L2s).
- **Vanilla x402** signs an EIP-3009 / permit and the facilitator broadcasts it. Settlement = one block on the destination chain (~2s on BASE, ~12s on ETH, ~5s on Polygon).
- **Gateway balances are per source chain.** No cross-chain pooling at payment time. `circle gateway withdraw` (v1) is **same-chain only**. To move USDC across chains, use `circle bridge transfer` (vanilla) or withdraw → bridge.

## Chain-speed reference

Use this to decide whether Gateway is worth the cold-start wait. The Circle CLI accepts only these mainnet `--chain` values for Gateway-payable flows (`circle blockchain list` is authoritative; values come from `apps/cli/src/gateway-config.ts` `GATEWAY_CHAIN_CONFIGS` ∩ `NETWORK_TO_GATEWAY_DOMAIN`):

| CLI `--chain` | Gateway domain | Deposit-to-ready | Class |
|----------------|----------------|------------------|-------|
| MATIC (Polygon)  | 7 | ~8s        | **fast** |
| AVAX (Avalanche) | 1 | ~8s        | **fast** |
| BASE             | 6 | ~13-19 min | slow |
| ETH (Ethereum)   | 0 | ~13-19 min | slow |
| ARB (Arbitrum)   | 3 | ~13-19 min | slow |
| OP (Optimism)    | 2 | ~13-19 min | slow |
| UNI (Unichain)   | 10| ~13-19 min | slow |

(Finality times: <https://developers.circle.com/gateway/references/supported-blockchains#required-block-confirmations>.)

**Heads-up — chains the CLI can't pay on yet**: x402 sellers may publish `accepts[]` entries on Sonic, Sei, HyperEVM, World Chain, Solana, or Monad. Gateway supports those at the protocol level, but the CLI does not yet expose a matching `--chain` value, so `circle services pay` cannot use them. Skip those accepts and pick a CLI-supported chain instead — or search for a different provider (`circle services search`).

## Decision procedure

1. **Inspect** the seller and read the raw 402 `accepts[]`. Each entry has a `network` (`eip155:<chainId>` or `solana:<id>`) and an `extra.name` — `GatewayWalletBatched` means Gateway, anything else (typically `USD Coin` or absent) means vanilla x402. **Also note the `method` field** (e.g., `GET`, `POST`) — you must pass this via `-X` in the `pay` command.
2. **Enumerate** the user's vanilla balance per chain in the seller's accepts and Gateway balance globally.
3. **Pick** using the table below. Walk top-to-bottom and use the first row that fits.
4. **Execute**. Confirm with the user only when prompted by the table or when amount exceeds the user's stated cap (use `--max-amount`).

| Seller offers                                          | User has                                       | Action                                                                                                                            |
|--------------------------------------------------------|------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| Gateway on **any chain** X (fast or slow)              | Gateway ≥ price on X                           | `pay -X <method> --chain X` (warm Gateway = <500ms regardless of chain finality)                                                |
| Gateway on **fast chain** F = MATIC                    | Cold-start, vanilla ≥ price on BASE (no MATIC vanilla) | `gateway deposit --chain BASE --method eco` (~30-50s, $0.03 flat fee, settles on Polygon), then `pay -X <method> --chain MATIC` |
| Gateway on **fast chain** F                            | Cold-start, vanilla ≥ price on F               | `gateway deposit --chain F --method direct` (~8s, no eco fee), then `pay -X <method> --chain F`                               |
| Vanilla on X (seller offers no Gateway on X)           | Vanilla ≥ price on X                           | `pay -X <method> --chain X` (one block on X)                                                                                    |
| Vanilla on X (seller offers no Gateway on X)           | Vanilla ≥ price on Y (Y≠X)                     | `bridge transfer X --amount … --chain Y` (CCTP ~8-20s), then `pay -X <method> --chain X`                                      |
| Vanilla on X (seller offers no Gateway on X)           | Gateway ≥ price on X                           | `gateway withdraw --chain X` → `pay -X <method> --chain X` (Workflow B)                                                       |
| Vanilla on X (seller offers no Gateway on X)           | Gateway ≥ price on Y (Y≠X), 0 vanilla on X     | `gateway withdraw --chain Y` → `bridge transfer X --chain Y` → `pay -X <method> --chain X` (Workflow A)                    |
| Both Gateway and vanilla on X                          | Gateway ≥ price on **any chain in seller's accepts** | `pay -X <method> --chain <funded-chain>` (CLI auto-routes if you pass `--chain X`, but explicit is faster).                    |
| Both Gateway and vanilla on X                          | 0 Gateway on any seller-accepted chain, vanilla ≥ price on X | **CLI gap** — `pay -X <method> --chain X` auto-picks Gateway and errors with `Insufficient Gateway balance ...` (or `No Gateway balance found ...`). See "Type-mismatch CLI gap" below. |
| Only Gateway on **slow chain** S, no vanilla anywhere | Vanilla ≥ price on **fast chain** F            | Search for an alternative provider that offers vanilla on F or Gateway on a fast chain (`circle services search`). If none, ask the user whether to deposit to Gateway-on-S (~13-19 min wait). |
| Only Gateway on chain X, no vanilla in seller          | Gateway ≥ price on Y (Y≠X), 0 on X             | Workflow C: withdraw on Y → bridge Y→X → deposit Gateway on X → `pay -X <method> --chain X`                                    |
| Nothing matches                                        | Any                                            | Fund first: `curl -sL https://agents.circle.com/skills/wallet-fund.md`                                                                  |

## Workflows

### Workflow A — cross-chain via Gateway withdraw + bridge

Source: Gateway on Y. Destination: vanilla on X.

```bash
circle gateway withdraw --amount <price+fee+slack> --address <addr> --chain <Y>
circle bridge transfer <X> --amount <price> --address <addr> --chain <Y>
circle services pay "<url>" -X <method> --address <addr> --chain <X>
```

For exact flags and output, run `circle gateway withdraw --help` and `circle bridge transfer --help`.

### Workflow B — same-chain Gateway → vanilla

Source: Gateway on X. Destination: vanilla on X (seller doesn't accept Gateway on X).

```bash
circle gateway withdraw --amount <price+fee+slack> --address <addr> --chain <X>
circle services pay "<url>" -X <method> --address <addr> --chain <X>
```

### Workflow C — Gateway-only seller on X, user's Gateway on Y

Rare; most x402 sellers that offer Gateway also list vanilla on the same chain. Verify by reading the raw 402 `accepts[]`, not `circle services inspect` (which summarises only one accept).

```bash
circle gateway withdraw --amount <price+fees+slack> --address <addr> --chain <Y>
circle bridge transfer <X> --amount <price+fee> --address <addr> --chain <Y>
circle gateway deposit --amount <price+fee> --address <addr> --chain <X> --method direct
circle services pay "<url>" -X <method> --address <addr> --chain <X>
```

## Pre-deposit guidance

When suggesting a Gateway deposit:

- **Sizing**: `amount = max(price × N + fee + slack, Gateway minimum)`, where N is the workflow's expected call count. Cap to ~50% of vanilla balance for headroom. Cheap-endpoint check: if `price × N` is well below the Gateway minimum (e.g. AIsa YouTube at $0.0024/call), the minimum sets the floor, not the workflow cost.
- **Surface to user when**: the required deposit is materially larger than the workflow's total cost (the minimum dwarfs the task), or above the user's stated `--max-amount` cap. Ask before depositing; don't silently deposit ~100x the task cost.
- **Skip the deposit suggestion entirely** only when the user has no usable vanilla, or when the Gateway minimum exceeds the safe headroom share of the user's balance.

### Vanilla vs eco-then-Gateway is a per-workflow decision, not per-call

The cold-start cost of eco (~30-50s deposit + $0.03 fee) is paid **once**. After that, every Gateway-supported call is <500ms. Vanilla x402 has no deposit, but every call costs ~2s plus facilitator overhead, forever, with no amortization.

For an agentic workflow with N paid calls:

| Path | Total time | Total cost |
|---|---|---|
| Vanilla x402 on BASE (fresh wallet, SCA deploy on first call) | ~30s + N × ~2s | N × price |
| Eco deposit + Gateway (fresh wallet) | ~30-50s + N × <0.5s | N × price + $0.03 once |

Agentic workflows are almost never N=1. "Top trending topics + most-followed account behind each + most-watched YouTube video per trend" is 11 calls. "Monitor X for sentiment shifts" is many. "Research topic Y" is many.

Treat the deposit decision as **wallet onboarding**, not a per-call optimization. If any task-fit seller you intend to call accepts Polygon Gateway, the answer is eco unless one of the four direct-deposit conditions below applies (most commonly condition 4: the user already has vanilla on a fast chain a seller accepts, where `direct --chain <fast-chain>` is ~8s and skips the eco fee).

### Use `--method eco` unless one of these conditions holds

`--method eco` deposits BASE vanilla into Gateway and lands on Polygon (Gateway domain 7) in ~30-50s for a $0.03 flat fee. The follow-up is `pay -X <method> --chain MATIC`. Use `--method direct` **only** when:

1. **User explicitly asked for direct** — e.g. "deposit on BASE without going to Polygon", "stay on BASE", "use direct deposit". Implicit preferences and your own inferences do not count.
2. **Source chain isn't BASE** — eco only supports BASE source today. Try `circle gateway deposit --chain ETH --method eco` and you'll get `Unknown method ...` or chain-not-supported.
3. **No task-fit seller you intend to call accepts Polygon Gateway** — verify by reading the raw 402 `accepts[]` for each seller you actually plan to call (not `circle services inspect` summary, and ignore Gateway-capable endpoints that aren't task-fit). Eco lands on Polygon; if no relevant seller can pay there, eco is useless.
4. **User already has vanilla on a fast chain a seller accepts** — then `direct --chain <fast-chain>` is ~8s and skips the eco fee. (E.g. user has 5 USDC vanilla on Polygon directly → `direct --chain MATIC`.)

If none of conditions 1-4 holds, **the answer is eco**. Picking direct anyway costs the user 13-19 minutes of finality wait + gas vs eco's ~30-50s + $0.03.

### Common rationalizations for skipping eco or picking direct (don't)

| Rationalization | Reality |
|---|---|
| "The eco fee is $0.03. Vanilla saves that for one-shot calls." | The deposit amortizes over the next call. Agentic workflows are not one-shot. Compare per-workflow, not per-call. |
| "Eco's ~30-50s wait is slower than vanilla's ~2s for the first call." | True for one call. Pure time breakeven is later (vanilla `30 + 2N` vs eco `30-50 + 0.5N` lands at roughly N=7-13 across the realistic eco-timing range). The immediate wins are different: Gateway-only seller access (unlocks task-fit sellers vanilla can't reach), wallet onboarding (every subsequent call <500ms), and amortizing a single $0.03 fee instead of paying ~2s per call forever. Access + future UX pays off at call 1, not call 3. |
| "I have only vanilla on BASE so I'll only consider vanilla-on-BASE sellers." | This is the failure mode the skill exists to fix. Read all sellers that fit the user's task. If a Gateway-only seller serves the user's need better, deposit eco and use it. |
| "Locking part of the user's vanilla into Gateway is risky." | A $0.50 to $5 deposit on a 9 USDC balance leaves 4-8 USDC vanilla. That's headroom, not lock-out. |
| "Direct keeps everything on BASE, no chain juggling for the pay call." | One extra flag (`--chain MATIC`) on the next command. Not a UX cost worth 12 minutes. |
| "Polygon is a different chain, that complicates things for the user." | The user doesn't see the chain — they see the result. Time-to-result is the metric. |
| "Eco fee is wasteful." | $0.03. Their wait time is more valuable. |
| "I'm not sure the seller accepts Polygon." | Read the raw 402 `accepts[]`. If Polygon is there, eco. If not, direct. Don't guess. |
| "User has lots of USDC, the path doesn't matter." | The path determines time-to-result. Direct on BASE adds 12+ minutes. |
| "Direct is more reliable / better tested." | Eco is the documented default and well-tested. This is a fabricated concern. |
| "User didn't say eco, so they probably want direct." | They didn't say either. The default is eco. Direct requires an explicit ask. |
| "I already started a direct deposit, may as well finish." | Sunk cost. Cancel and switch to eco if you haven't broadcast yet. |

### Red flags — STOP and re-check before running direct or skipping eco

- You're about to run `circle gateway deposit ... --chain BASE --method direct`.
- You're about to pick a vanilla-on-BASE seller over a Gateway-supporting seller because "we have vanilla on BASE."
- You inferred a "preference for staying on BASE" from context, but the user never said it.
- You decided eco's $0.03 fee or "chain juggling" was worth a 12-minute wait.
- The seller's raw 402 `accepts[]` lists `eip155:137` (Polygon) but you're not using eco.
- You're not 100% sure you can name which of conditions 1-4 above applies.

If any red flag fires: stop, re-read the conditions, and switch to eco if none of 1-4 applies.

## Type-mismatch CLI gap (known)

**Symptom**: Seller's `accepts[]` lists both Gateway and vanilla on `--chain`. User has vanilla on `--chain` but cannot satisfy Gateway on **any chain the seller accepts** (zero everywhere, or only on a chain the seller doesn't accept). `circle services pay` errors with one of:

> No Gateway balance found. A deposit is required before making batched payments.
>   Hint: Run `circle gateway deposit` to add funds. Or pay directly with standard x402 (no Gateway deposit needed).

> Insufficient Gateway balance for $X.XXX USDC payment. Current balances: Polygon: 0.052438 USDC.
>   Hint: Run `circle gateway deposit` to add funds. Or pay directly with standard x402 (no Gateway deposit needed).

The "pay directly with standard x402" hint is misleading: there is currently no flag to force vanilla when both schemes are accepted on `--chain`. The CLI's `selectPaymentOption` always picks Gateway first, and the preflight only auto-fallbacks to another **funded Gateway domain that the seller accepts** — not to vanilla on the same chain.

**Workarounds, in order of preference:**

1. Pick a different chain in the seller's accepts where you can satisfy Gateway. If the seller offers Gateway on Polygon and the user's vanilla is on BASE → `circle gateway deposit --chain BASE --method eco` (~30-50s, settles on Polygon), then `pay -X <method> --chain MATIC`. This is the canonical fast path.
2. If the seller doesn't accept Polygon, deposit Gateway on `--chain` directly: `circle gateway deposit --amount <price+fee> --address <addr> --chain <CHAIN> --method direct`. Use this only when eco isn't applicable (see "Pre-deposit guidance").
3. Bridge vanilla to a chain where the seller offers vanilla **only** (no Gateway entry on that chain), then `pay -X <method> --chain <new-chain>`.
4. Find a different provider (`circle services search`).

## x402 v1 protocol mismatch (manual-sign fallback)

**Edge case** — a minority of bazaar sellers. Remove this section once the CLI aliases `"base"` ↔ `"eip155:8453"`.

**Symptom**: `pay` errors with `Seller does not accept --chain BASE. Accepted chains: base. Hint: Retry with --chain BASE.` (same chain on both sides). Seller speaks x402 v1 (`"network":"base"` string); CLI matcher expects v2's `"eip155:8453"`.

**Fix**: sign the EIP-3009 `TransferWithAuthorization` yourself. Only `circle wallet sign typed-data` needs Circle's custody — everything else is shell + curl.

1. `curl <url>` (matching the eventual method/body) → read `accepts[0].{payTo, maxAmountRequired, asset}` from the 402.
2. Build EIP-712 typed data per [EIP-3009][eip3009]. USDC-on-Base domain: `{ name:"USD Coin", version:"2", chainId:8453, verifyingContract:<asset> }`. Message: `{ from:<wallet>, to:<payTo>, value:<maxAmountRequired verbatim — micro-USDC, no decimal conversion>, validAfter:"0", validBefore:<now+300>, nonce:<random 32-byte hex> }`. All numeric fields stringified.
3. `circle wallet sign typed-data '<json>' --address <wallet> --chain BASE --quiet`
4. base64 of `{ x402Version:1, scheme:"exact", network:"base", payload:{ signature, authorization } }` → `X-PAYMENT` header. Full payload shape: [x402 spec][x402].
5. Replay original request with the header → `200 OK` + `X-PAYMENT-RESPONSE` (settlement tx hash; buyer pays 0 gas).

Signature is single-use, bound to `(from, to, value, nonce, validBefore)`. Re-sign with a new nonce on retry. `circle services inspect` is unreliable for v1 sellers — use the raw 402 instead. For Solana sellers, scheme is different (ed25519, not EIP-712).

[eip3009]: https://eips.ethereum.org/EIPS/eip-3009
[x402]: https://github.com/coinbase/x402/blob/main/specs/schemes/exact/scheme_exact_evm.md

## Common errors

| Error                                                                                | What it means                                                                | Fix                                                                                                                                       |
|--------------------------------------------------------------------------------------|------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| `No Gateway balance found. A deposit is required ...`                                | User has 0 Gateway anywhere; CLI auto-picked Gateway.                        | Default: `gateway deposit --chain BASE --method eco` (settles on Polygon, ~30-50s) then `pay -X <method> --chain MATIC` if the seller accepts Polygon. Otherwise deposit `--method direct` on a chain the seller accepts. See "Pre-deposit guidance". |
| `Insufficient Gateway balance for X.XXX USDC payment. Current balances: ...`         | Some Gateway balance exists, just not enough on `--chain`.                  | Top up via `gateway deposit`, OR retry on a chain where balance ≥ price (CLI auto-switches if any funded Gateway domain matches accepts). |
| `Seller does not accept --chain X. Accepted chains: Y, Z.`                           | `--chain` not in seller `accepts[]`.                                       | Re-run with one of the listed chains. The CLI hint may already point at a funded chain you have.                                          |
| `Seller does not accept --chain BASE. Accepted chains: base.` (same chain both sides) | Seller speaks x402 v1; CLI expects v2 chain enum.                            | Use manual-sign fallback. See "x402 v1 protocol mismatch".                                                                                |
| `Could not sign payment authorization: invalid transaction or rawTransaction`        | `--chain` doesn't match where the user's balance lives.                     | Re-check Step 2 outputs.                                                                                                                  |
| `Wallet not deployed`                                                                | First tx on this chain — SCA needs deployment.                               | `circle wallet transfer <addr> --amount 0 --address <addr> --chain <CHAIN> --token usdc`                                                |
| `HeadersOverflowError` / `UND_ERR_HEADERS_OVERFLOW`                                  | Large x402 payment header.                                                   | `export NODE_OPTIONS=--max-http-header-size=262144` then re-run.                                                                        |
| HTTP `401`/`403` or status `unavailable` (no 402 challenge)                          | Seller gates the x402 challenge behind a required request header.            | Check the discovery `description`/`requiredHeaders`, then retry with `-H "<Header>: <value>"` (e.g. vaults.fyi: `-H "x-402-auth: true"`). Don't abandon the endpoint. |
| Request timeout                                                                      | Slow seller.                                                                 | Add `--timeout 60` (or higher).                                                                                                         |
| HTTP 405 `Method Not Allowed` after payment                                          | CLI sent POST (implied by `--data`) but seller only accepts GET.             | Pass `-X GET` explicitly — always use the method from `inspect` output.                                                                |
| `Cross-chain withdraw (--destination) is not yet supported`                          | Tried `gateway withdraw --destination`.                                     | v1 is same-chain only. Use Workflow A instead.                                                                                            |

## Advanced

- `--timeout <seconds>`: override the default 30s seller-response timeout.
- `--max-amount <usdc>`: refuse to pay more than this — useful when the user has a stated cap.
- `--estimate`: price preview only, no signing or balance preflight (chain-agnostic).
- Large payment headers: `export NODE_OPTIONS=--max-http-header-size=262144`.
- Payment debug logs land in `~/.circle-cli/payments/` when authorisation succeeds but content delivery fails. No secrets; safe to share.

For full flag lists and JSON output shapes, run `<cmd> --help` — these change as the CLI evolves and are authoritative there, not here.

---

**Current location**: `/skills/wallet-pay.md`

**For full skill directory**: Read https://agents.circle.com/.well-known/agent-skills/index.json to see all available skills and navigate between them.
