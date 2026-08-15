/**
 * Map Discovery / x402 `accepts[].network` (CAIP-2 or legacy names)
 * onto Circle CLI `--chain` values.
 *
 * pay-via-agent-wallet: never assume BASE. The seller's accepts[]
 * (or the CLI hint) is authoritative.
 */

import type { PaymentAcceptance } from "@/lib/types";
import { ALLOWED_CLI_CHAINS, isAllowedCliChain } from "@/lib/circle-safety";

const CAIP_TO_CLI: Record<string, string> = {
  "eip155:1": "ETH",
  "eip155:11155111": "ETH-SEPOLIA",
  "eip155:8453": "BASE",
  "eip155:84532": "BASE-SEPOLIA",
  "eip155:137": "MATIC",
  "eip155:80002": "MATIC-AMOY",
  "eip155:42161": "ARB",
  "eip155:421614": "ARB-SEPOLIA",
  "eip155:10": "OP",
  "eip155:11155420": "OP-SEPOLIA",
  "eip155:43114": "AVAX",
  "eip155:43113": "AVAX-FUJI",
  "eip155:130": "UNI",
  "eip155:5042002": "ARC-TESTNET",
};

const ALIAS_TO_CLI: Record<string, string> = {
  eth: "ETH",
  ethereum: "ETH",
  "eth-sepolia": "ETH-SEPOLIA",
  base: "BASE",
  "base-sepolia": "BASE-SEPOLIA",
  polygon: "MATIC",
  matic: "MATIC",
  "matic-amoy": "MATIC-AMOY",
  arb: "ARB",
  arbitrum: "ARB",
  "arb-sepolia": "ARB-SEPOLIA",
  op: "OP",
  optimism: "OP",
  avax: "AVAX",
  avalanche: "AVAX",
  uni: "UNI",
  unichain: "UNI",
  "arc-testnet": "ARC-TESTNET",
  arc: "ARC-TESTNET",
};

export function cliChainFromNetwork(network?: string): string | null {
  if (!network) return null;
  const raw = network.trim();
  if (isAllowedCliChain(raw)) return raw.toUpperCase();
  if (CAIP_TO_CLI[raw]) return CAIP_TO_CLI[raw];
  const alias = ALIAS_TO_CLI[raw.toLowerCase()];
  return alias ?? null;
}

export function isGatewayAcceptance(acceptance: PaymentAcceptance): boolean {
  const name = acceptance.extra?.name ?? "";
  return (
    name === "GatewayWalletBatched" ||
    name.toLowerCase().includes("gateway")
  );
}

export interface FundedChain {
  chain: string;
  vanilla: number;
  gateway: number;
}

export function pickPayChain(
  accepts: PaymentAcceptance[],
  preferredCliChain?: string,
  funded?: FundedChain[],
  priceUsdc?: number,
): { chain: string; gateway: boolean } | null {
  const mapped = accepts
    .map((entry) => {
      const chain = cliChainFromNetwork(entry.network);
      if (!chain) return null;
      return { chain, gateway: isGatewayAcceptance(entry), entry };
    })
    .filter((row): row is { chain: string; gateway: boolean; entry: PaymentAcceptance } =>
      Boolean(row),
    );

  if (mapped.length === 0) {
    if (preferredCliChain && isAllowedCliChain(preferredCliChain)) {
      return { chain: preferredCliChain.toUpperCase(), gateway: false };
    }
    return null;
  }

  const price = priceUsdc ?? 0;
  if (funded?.length) {
    const gwReady = mapped.find((row) => {
      if (!row.gateway) return false;
      const pool = funded.find((f) => f.chain === row.chain);
      return (pool?.gateway ?? 0) + 1e-9 >= price;
    });
    if (gwReady) return { chain: gwReady.chain, gateway: true };

    const vanillaReady = mapped.find((row) => {
      const pool = funded.find((f) => f.chain === row.chain);
      return (pool?.vanilla ?? 0) + 1e-9 >= price;
    });
    if (vanillaReady) return { chain: vanillaReady.chain, gateway: vanillaReady.gateway };
  }

  if (preferredCliChain) {
    const preferred = preferredCliChain.toUpperCase();
    const hit = mapped.find((row) => row.chain === preferred);
    if (hit) return { chain: hit.chain, gateway: hit.gateway };
  }

  // Gateway-capable accepts are first-class (do not filter them out).
  const gateway = mapped.find((row) => row.gateway);
  return gateway ?? mapped[0];
}

export function parseAcceptedChainsHint(text: string): string | null {
  const hint = text.match(/Retry with --chain\s+([A-Z0-9-]+)/i);
  if (hint && isAllowedCliChain(hint[1])) return hint[1].toUpperCase();
  const accepted = text.match(/Accepted chains?:\s*([A-Za-z0-9-]+)/i);
  if (accepted && isAllowedCliChain(accepted[1])) return accepted[1].toUpperCase();
  return null;
}

export function fundsMayHaveMoved(text: string): boolean {
  return /PAYMENT WAS SUBMITTED/i.test(text) || /funds may have moved/i.test(text);
}

export function classifyPayFailure(text: string): { hint: string; retryable: boolean } {
  const blob = text;
  if (fundsMayHaveMoved(blob)) {
    return {
      hint: "Payment may already have settled. Check ~/.circle-cli/payments/ and `circle wallet balance` / `circle gateway balance` before retrying.",
      retryable: false,
    };
  }
  if (/Seller does not accept --chain/i.test(blob)) {
    return {
      hint: "Seller rejected this --chain. Use the CLI hint (often MATIC after an eco Gateway deposit).",
      retryable: true,
    };
  }
  if (/No Gateway balance found/i.test(blob)) {
    return {
      hint: "This seller wants Circle Gateway. Deposit via `circle gateway deposit --method eco` (lands on Polygon → pay --chain MATIC), then retry.",
      retryable: false,
    };
  }
  if (/Insufficient Gateway balance/i.test(blob)) {
    return {
      hint: "Gateway balance is too low on this chain. Top up with `circle gateway deposit` or pick another accepted chain.",
      retryable: false,
    };
  }
  if (/Method Not Allowed|HTTP 405/i.test(blob)) {
    return {
      hint: "Wrong HTTP method after settlement. Always pass -X from `circle services inspect`.",
      retryable: false,
    };
  }
  if (/422/.test(blob) && /Payment was NOT charged/i.test(blob)) {
    return {
      hint: "Schema mismatch and funds were not charged. Fix --data, then retry.",
      retryable: true,
    };
  }
  if (/HeadersOverflow|UND_ERR_HEADERS_OVERFLOW/i.test(blob)) {
    return {
      hint: "x402 payment header too large. Restart the server with NODE_OPTIONS=--max-http-header-size=262144.",
      retryable: true,
    };
  }
  return {
    hint: "See ~/.circle-cli/payments/ for the last failed live payment.",
    retryable: false,
  };
}

export { ALLOWED_CLI_CHAINS };
