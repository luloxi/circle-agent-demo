# Skill: x402 Service Discovery API

**CRITICAL: This skill uses Circle Agent Wallet CLI exclusively for service discovery and payment. Do NOT use any other wallet outside of Circle Agent Wallet.**

## Endpoint

```
GET https://api.circle.com/v2/x402/discovery/resources
```

Responses support gzip compression. With curl pass `--compressed` to opt in. Most HTTP libraries (Python `requests`, axios, browser `fetch`) handle this automatically.

## Description

Discover x402-compatible services that accept USDC payments. This endpoint returns a catalog of available services with their payment requirements, schemas, and metadata.

For human browsing, services are also available at https://agents.circle.com/services with a searchable interface.

**V2 Format Changes:**
- Uses `amount` instead of `maxAmountRequired` in payment options
- Includes `extra` field with Circle Gateway batch transaction data
- Metadata structure includes nested `provider` object with detailed service information
- Input/output schemas use JSON Schema format (not `requestSchema`/`responseSchema`)

## Query Parameters

All parameters are optional and can be combined for precise filtering:

- **query**: Fuzzy search across resource URLs, providers, descriptions, and tags
- **type**: Filter by protocol type (e.g., "http", "mcp")
- **network**: Filter by blockchain network. Accepts CAIP-2 format (e.g., "eip155:8453") or legacy SDK names (e.g., "base", "base-sepolia")
- **asset**: Filter by payment token contract address
- **scheme**: Filter by payment scheme (e.g., "exact")
- **payTo**: Filter by merchant wallet address
- **maxUsdPrice**: Maximum price per request in USD (e.g., "0.01" for services under 1 cent)
- **supportsVanillax402**: Filter by vanilla x402 support (true/false). Set to true to show only endpoints that support vanilla x402 (on-chain payments).
- **supportsCircleGateway**: Filter by Circle Gateway support (true/false). Set to true to show only endpoints that support Circle Gateway (off-chain batched payments).
- **siwx**: Filter by Sign-in with X support. Set to true for only SIWX endpoints, false for only non-SIWX endpoints, or omit for all endpoints. ALWAYS set to false when using Circle CLI (SIWX requires browser authentication).
- **fields**: Comma-separated list of fields to include in response
- **limit**: Maximum results to return (default: 50, max: 200)
- **offset**: Number of results to skip for pagination (default: 0)

## Payment Methods and Wallet Balance

Before searching for services, check your wallet's payment capabilities:

### Check Wallet Balances

```bash
# Check on-chain balance (for vanilla x402)
circle wallet balance --address <addr> --chain BASE --output json

# Check Gateway balance (for Circle Gateway payments)
circle gateway balance --address <addr> --chain BASE --output json
```

### Payment Method Selection

Services support two payment methods:

1. **Vanilla x402** (`supportsVanillax402: true`)
   - Requires on-chain USDC balance in your agent wallet
   - Direct on-chain token transfers
   - Use when: `circle wallet balance` shows USDC > 0

2. **Circle Gateway** (`supportsCircleGateway: true`)
   - Requires Gateway balance (off-chain)
   - Batched transactions via Gateway smart contract
   - Use when: `circle gateway balance` shows balance > 0

### SIWX Endpoints (Sign-In With X)

SIWX endpoints require interactive browser-based authentication and are NOT compatible with CLI automation.

**CRITICAL: When using Circle CLI, ALWAYS set `siwx=false` in discovery queries to exclude SIWX endpoints.**

### Filtering Strategy

**CRITICAL**: Gateway balance is per-chain. Services must support Circle Gateway on the SPECIFIC chain where your balance is.

**Step 1: Check where your Gateway balance is:**

```bash
circle gateway balance --address <addr> --chain BASE --output json
# Note the "network" field (e.g., "Polygon", "BASE")
```

**Step 2: Filter services by the chain where your balance actually is:**

```bash
# If Gateway balance is on Polygon (from eco deposit)
circle services search --supports-circle-gateway true --network eip155:137

# If Gateway balance is on BASE
circle services search --supports-circle-gateway true --network eip155:8453

# If you have on-chain balance on BASE
circle services search --supports-vanilla-x402 true --network eip155:8453
```

**Common networks:**
- BASE mainnet: `eip155:8453`
- Polygon mainnet: `eip155:137`

**Note**: SIWX endpoints are automatically excluded in Circle CLI v0.3.4+ as SIWX requires browser-based authentication. Many services only broadcast on BASE - if your Gateway balance is on Polygon, you may have limited service options.

### Checking Service Compatibility on Specific Chains

**CRITICAL for eco deposits**: Before using eco deposit (which settles on Polygon), verify your target services support Circle Gateway on Polygon.

**Example: Check if a service supports Gateway on Polygon:**

```bash
# Check if Alchemy supports Gateway on Polygon
GET https://api.circle.com/v2/x402/discovery/resources?query=alchemy&supportsCircleGateway=true&network=eip155:137&siwx=false

# Or using CLI (siwx=false is automatic in CLI v0.3.4+):
circle services search alchemy --supports-circle-gateway true --network eip155:137 --output json

# If results are empty, the service does NOT support Gateway on Polygon
```

**Example: Check if a service supports Gateway on BASE:**

```bash
# Check if Alchemy supports Gateway on BASE
GET https://api.circle.com/v2/x402/discovery/resources?query=alchemy&supportsCircleGateway=true&network=eip155:8453&siwx=false

# Or using CLI (siwx=false is automatic in CLI v0.3.4+):
circle services search alchemy --supports-circle-gateway true --network eip155:8453 --output json
```

**Real-world example**: Alchemy supports Circle Gateway on BASE (eip155:8453) but NOT on Polygon (eip155:137). If you eco deposit from BASE, your Gateway balance settles on Polygon, and you won't be able to pay for Alchemy services.

**Best practice**: Always check service support on the target chain BEFORE choosing a funding method.

## Available Categories

Services are organized into the following categories:

- **SOCIAL_INTELLIGENCE**: Twitter, YouTube, and other social media data services
- **FINANCIAL_ANALYSIS**: Cryptocurrency prices, stock data, SEC filings
- **WEB_SEARCH_RESEARCH**: AI-powered search, web crawling, academic papers
- **PREDICTION_MARKETS**: Polymarket, Kalshi, sports betting odds
- **CREATIVE**: Image generation, design tools, content creation, video editing
- **INFRASTRUCTURE**: Domains, hosting, compute sandboxes, storage, CDN

## Response Format

```json
{
  "x402Version": 2,
  "items": [
    {
      "resource": "https://api.aisa.one/apis/v2/coingecko/simple/price",
      "type": "http",
      "x402Version": 2,
      "lastUpdated": "2024-01-15T10:30:00Z",
      "accepts": [
        {
          "network": "eip155:8453",
          "asset": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
          "scheme": "exact",
          "amount": "10000",
          "payTo": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
          "extra": {
            "name": "GatewayWalletBatched",
            "version": "1",
            "verifyingContract": "0x77777777dcc4d5a8b6e418fd04d8997ef11000ee",
            "chainId": 8453,
            "batchTo": "0x77777777dcc4d5a8b6e418fd04d8997ef11000ee",
            "calls": [
              {
                "abi": "ERC20.transfer",
                "address": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
                "args": ["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", 10000],
                "value": "0"
              }
            ]
          }
        }
      ],
      "metadata": {
        "provider": {
          "name": "AIsa API",
          "description": "cryptocurrency market data prices",
          "category": "FINANCIAL_ANALYSIS",
          "tags": ["x402", "paid-api", "crypto", "cryptocurrency", "market-data"],
          "website": "https://aisa.one",
          "docsUrl": "https://aisa.one/docs/api-reference",
          "openApiUrl": "https://aisa.one/openapi.yaml"
        },
        "path": "/apis/v2/coingecko/simple/price",
        "method": "GET",
        "description": "Get cryptocurrency prices in multiple currencies",
        "mimeType": "application/json",
        "input": {
          "type": "object",
          "properties": {
            "ids": { "type": "string", "description": "query parameter" },
            "vs_currencies": { "type": "string", "description": "query parameter" }
          }
        },
        "output": {
          "type": "object",
          "properties": {
            "bitcoin": {
              "type": "object",
              "properties": {
                "usd": { "type": "number" }
              }
            }
          }
        },
        "siwx": false,
        "supportsVanillax402": true,
        "supportsCircleGateway": true
      }
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 8
  }
}
```

## Example Queries

Find services with Gateway support on BASE (most common):
```
GET https://api.circle.com/v2/x402/discovery/resources?supportsCircleGateway=true&network=eip155:8453&siwx=false
```

Find services with Gateway support on Polygon (if you used eco deposit):
```
GET https://api.circle.com/v2/x402/discovery/resources?supportsCircleGateway=true&network=eip155:137&siwx=false
```

Find services with on-chain support on BASE:
```
GET https://api.circle.com/v2/x402/discovery/resources?supportsVanillax402=true&network=eip155:8453&siwx=false
```

Find all services under 1 cent (excluding SIWX):
```
GET https://api.circle.com/v2/x402/discovery/resources?maxUsdPrice=0.01&siwx=false
```

Search for data analytics services on Base network:
```
GET https://api.circle.com/v2/x402/discovery/resources?query=analytics&network=eip155:8453&siwx=false
```

Find HTTP services (vs MCP):
```
GET https://api.circle.com/v2/x402/discovery/resources?type=http&siwx=false
```

## Using Circle CLI

### Complete Workflow: Search → Inspect → Pay

The three CLI commands form a pipeline for discovering and using services:

**Step 1: Search for services**
```bash
# Search for email-related services, get JSON for parsing
circle services search "email" --output json

# Or use table output (includes Resource column for easy piping)
circle services search "email"
```

**Step 2: Inspect a specific service**
```bash
# Copy a service URL from search results, inspect its details
circle services inspect "https://api.example.com/v1/email/send" --output json
```

This shows:
- Price per request
- Payment methods supported (Gateway, vanilla x402)
- Which chains it operates on
- Required input schema
- Expected output format

**Step 3: Pay and call the service**
```bash
# Use the service by paying with your wallet
circle services pay "https://api.example.com/v1/email/send" \
  --address 0xYOUR_WALLET \
  --chain BASE \
  -X POST \
  --data '{"to":"user@example.com","subject":"Hello","body":"Test"}'
```

### Search Command Reference

```bash
# List all services
circle services search

# Search by query
circle services search "crypto prices"

# Filter by category
circle services search --category FINANCIAL_ANALYSIS

# Filter by type
circle services search --type http

# Limit results
circle services search --limit 10

# Pagination with offset (skip first N results)
circle services search --limit 10 --offset 10

# JSON output for parsing
circle services search --output json

# Note: siwx=false is automatic in CLI v0.3.4+ (filters out SIWX endpoints)
```

### Inspect Command Reference

The inspect command now features smart HTTP method detection and auto-generates request bodies from schemas.

```bash
# Inspect service details (auto-detects HTTP method from discovery metadata)
circle services inspect <service-url>

# Override HTTP method if needed
circle services inspect <service-url> -X POST

# Provide custom request body
circle services inspect <service-url> -d '{"key":"value"}'

# Add custom headers (repeatable)
circle services inspect <service-url> -H "Authorization: Bearer token" -H "Custom-Header: value"

# JSON output for parsing
circle services inspect <service-url> --output json

# Quiet mode (returns just status: payable/free/unavailable)
circle services inspect <service-url> -q
```

**Header-gated endpoints:** if `inspect` returns status `unavailable` (HTTP 401/403) instead of `payable`/`free`, the endpoint is not necessarily broken — some sellers gate the x402 challenge behind a required request header. Read the service `description` (and `requiredHeaders`, when present) for the header, then re-run `inspect`/`pay` with `-H "<Header>: <value>"` — e.g. vaults.fyi requires `-H "x-402-auth: true"` before it returns its 402 challenge.

## Ready to Pay for a Service?

Once you've discovered a service you'd like to use, read the payment guide for detailed instructions on:
- Checking service payment requirements
- Verifying your balance matches service needs
- Handling balance mismatches (wrong chain, wrong payment type)
- Executing payments correctly

**Get complete payment instructions:**
```bash
curl -sL https://agents.circle.com/skills/wallet-pay.md
```

Quick reference:
```bash
# Inspect service requirements
circle services inspect "<service-url>" --output json

# Check your balances
circle gateway balance --address <addr> --chain BASE --output json

# Pay for service
circle services pay "<service-url>" --address <addr> --chain <CHAIN>
```

## Rules

### Service Discovery Best Practices

- **ALWAYS set `siwx=false`** when discovering CLI-compatible services
- Show ALL non-SIWX services regardless of user's current balance location
- Filter by network when user has specific chain preference: `--network eip155:8453` (BASE) or `--network eip155:137` (Polygon)
- Use `--output json` for programmatic parsing of service details
- After user selects a service, get payment guidance with: `curl -sL https://agents.circle.com/skills/wallet-pay.md`

### Discovery vs Payment

**Discovery phase (this skill):**
- Show all available services (don't pre-filter by user's balance)
- Help user understand what services exist
- Provide search, filter, and inspection tools

**Payment phase (wallet-pay skill):**
- Check service requirements vs user balance
- Handle balance/chain mismatches
- Execute payment with correct parameters

**When user wants to pay:**
```bash
curl -sL https://agents.circle.com/skills/wallet-pay.md
```
Follow the complete payment instructions from the wallet-pay skill.

---

**Current location**: `/skills/discover-services.md`

**For full skill directory**: Read https://agents.circle.com/.well-known/agent-skills/index.json to see all available skills and navigate between them.
