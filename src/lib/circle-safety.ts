/**
 * Circle skill safety rules (accept-agent-payments + pay-via-agent-wallet).
 * Seller-controlled fields (URL, method, headers, payload) must be validated
 * before they ever reach a CLI argument list.
 */

export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

const SHELL_META = /[;\n\r|&$`<>()"']/;

export function hasShellMeta(value: string): boolean {
  return SHELL_META.test(value);
}

export function isSafeHttpUrl(value: string): boolean {
  // Query strings need & = ? — those are not shell-safe as a blob, but we
  // pass the URL as a single argv to `circle`, never through a shell.
  if (/[;\n\r|$`<>()"']/.test(value) || /\s/.test(value)) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function isHttpMethod(value: string): value is HttpMethod {
  return (HTTP_METHODS as readonly string[]).includes(value.toUpperCase());
}

export function normalizeMethod(value: string | undefined, fallback: HttpMethod = "GET"): HttpMethod {
  if (value && isHttpMethod(value)) return value.toUpperCase() as HttpMethod;
  return fallback;
}

export function isSafeJsonPayload(value: string): boolean {
  // Quotes are required in JSON; argv spawn does not go through a shell.
  if (/[;\n\r|&$`<>()]/.test(value)) return false;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function isHeaderName(value: string): boolean {
  return /^[A-Za-z0-9-]+$/.test(value);
}

export function isSafeHeaderValue(value: string): boolean {
  return /^[\x20-\x7E]+$/.test(value) && !hasShellMeta(value);
}

/** CLI `--chain` values we will actually pass. Never invent a chain. */
export const ALLOWED_CLI_CHAINS = new Set([
  "BASE",
  "BASE-SEPOLIA",
  "ETH",
  "ETH-SEPOLIA",
  "MATIC",
  "MATIC-AMOY",
  "ARB",
  "ARB-SEPOLIA",
  "OP",
  "OP-SEPOLIA",
  "AVAX",
  "AVAX-FUJI",
  "UNI",
  "ARC-TESTNET",
]);

export function isAllowedCliChain(value: string): boolean {
  return ALLOWED_CLI_CHAINS.has(value.toUpperCase());
}
