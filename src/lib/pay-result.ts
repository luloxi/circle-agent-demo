/**
 * Unwrap Circle CLI `services pay --output json` and map seller bodies
 * (Allium prices, Exa search, demo mocks) into the Done card.
 *
 * CLI envelope:
 *   { data: { response: <seller>, payment: { amount: "$0.02 USDC", ... } } }
 */

export interface PriceQuote {
  symbol: string;
  label: string;
  price: number;
  change24h: number | null;
  timestamp?: string;
  chain?: string;
}

export interface SearchHit {
  title: string;
  url?: string;
  snippet?: string;
}

const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const WBTC = "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599";
const ZERO = "0x0000000000000000000000000000000000000000";

const TOKEN_META: Record<string, { symbol: string; label: string }> = {
  [WBTC]: { symbol: "BTC", label: "WBTC" },
  [WETH]: { symbol: "ETH", label: "WETH" },
  [ZERO]: { symbol: "ETH", label: "ETH" },
};

const SYMBOL_RANK: Record<string, number> = { BTC: 0, ETH: 1 };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function parseJsonish(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/** Walk CLI `{ data: { response } }` wrappers until a seller body appears. */
export function sellerBodyFromPayOutput(parsed: unknown): unknown {
  let current: unknown = parseJsonish(parsed);
  for (let depth = 0; depth < 6; depth += 1) {
    const rec = asRecord(current);
    if (!rec) return current;
    if (Array.isArray(rec.items) || Array.isArray(rec.quotes) || Array.isArray(rec.results)) {
      return rec;
    }
    const next =
      rec.response ?? rec.body ?? rec.result ?? rec.output ?? rec.payload ?? rec.data;
    if (next == null || next === current) return rec;
    current = parseJsonish(next);
  }
  return current;
}

export function chargedUsdcFromPayOutput(parsed: unknown): number | null {
  let current: unknown = parseJsonish(parsed);
  for (let depth = 0; depth < 4; depth += 1) {
    const rec = asRecord(current);
    if (!rec) return null;
    const payment = asRecord(rec.payment);
    if (payment) {
      const raw = payment.amount ?? payment.amountUsdc ?? payment.price;
      if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
      if (typeof raw === "string") {
        const match = raw.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
        if (match) {
          const n = Number(match[1]);
          if (Number.isFinite(n) && n > 0) return n;
        }
      }
    }
    const next = rec.data ?? rec.response;
    if (next == null || next === current) return null;
    current = parseJsonish(next);
  }
  return null;
}

function addrKey(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function metaForAddress(address: unknown, fallbackSymbol?: unknown): {
  symbol: string;
  label: string;
} {
  const known = TOKEN_META[addrKey(address)];
  if (known) return known;
  const symbol = String(fallbackSymbol ?? "TOKEN").toUpperCase();
  return { symbol, label: symbol };
}

function quoteFromUnknown(row: unknown): PriceQuote | null {
  const rec = asRecord(row);
  if (!rec) return null;
  const price =
    asNumber(rec.price) ??
    asNumber(rec.close) ??
    asNumber(rec.usd) ??
    asNumber(rec.priceUsd) ??
    asNumber(rec.price_usd);
  if (price == null || price <= 0) return null;
  const open = asNumber(rec.open);
  const change =
    asNumber(rec.change24h) ??
    asNumber(rec.change_24h) ??
    (open && open > 0 ? ((price - open) / open) * 100 : null);
  const { symbol, label } = metaForAddress(
    rec.address ?? rec.token_address ?? rec.tokenAddress,
    rec.symbol,
  );
  return {
    symbol,
    label,
    price,
    change24h: change,
    timestamp: typeof rec.timestamp === "string" ? rec.timestamp : undefined,
    chain: typeof rec.chain === "string" ? rec.chain : undefined,
  };
}

export function quotesFromPayload(payload: unknown): PriceQuote[] {
  const body = sellerBodyFromPayOutput(payload);
  const rec = asRecord(body);
  const rows: unknown[] = Array.isArray(body)
    ? body
    : rec
      ? [
          ...(Array.isArray(rec.items) ? rec.items : []),
          ...(Array.isArray(rec.quotes) ? rec.quotes : []),
        ]
      : [];
  const quotes = rows.map(quoteFromUnknown).filter((q): q is PriceQuote => q != null);
  return quotes.sort(
    (a, b) => (SYMBOL_RANK[a.symbol] ?? 50) - (SYMBOL_RANK[b.symbol] ?? 50),
  );
}

export function searchHitsFromPayload(payload: unknown): SearchHit[] {
  const body = sellerBodyFromPayOutput(payload);
  const rec = asRecord(body);
  if (!rec) return [];
  const rows = Array.isArray(rec.results)
    ? rec.results
    : Array.isArray(rec.posts)
      ? rec.posts
      : Array.isArray(rec.markets)
        ? rec.markets
        : [];
  const hits: SearchHit[] = [];
  for (const row of rows) {
    const item = asRecord(row);
    if (!item) continue;
    const title = String(item.title ?? item.name ?? item.handle ?? "").trim();
    const snippet = String(item.text ?? item.snippet ?? item.answer ?? "").trim();
    if (!title && !snippet) continue;
    hits.push({
      title: title || snippet.slice(0, 80),
      url: typeof item.url === "string" ? item.url : undefined,
      snippet: snippet || undefined,
    });
  }
  return hits.slice(0, 6);
}

export function formatUsdPrice(n: number): string {
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 0 : abs >= 1 ? 2 : 6;
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: digits === 2 ? 2 : 0,
    maximumFractionDigits: digits,
  })}`;
}

export function formatChangePct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function formatQuoteLine(quote: PriceQuote): string {
  const name = quote.label !== quote.symbol ? `${quote.symbol} (${quote.label})` : quote.symbol;
  const change =
    quote.change24h != null && Number.isFinite(quote.change24h)
      ? ` · ${formatChangePct(quote.change24h)} 24h`
      : "";
  const chain = quote.chain ? ` · ${quote.chain}` : "";
  return `${name} · ${formatUsdPrice(quote.price)}${change}${chain}`;
}

export function headlineFromQuotes(quotes: PriceQuote[]): string {
  return quotes.map((q) => `${q.symbol} ${formatUsdPrice(q.price)}`).join(" · ");
}
