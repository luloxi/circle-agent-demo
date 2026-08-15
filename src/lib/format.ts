import type { PaymentAcceptance, ServiceListing } from "@/lib/types";

const USDC_DECIMALS = 6;

export function truncateAddress(address: string, left = 6, right = 4): string {
  if (address.length <= left + right + 2) return address;
  return `${address.slice(0, left)}…${address.slice(-right)}`;
}

export function atomicToUsdc(atomic?: string | null): number | null {
  if (!atomic) return null;
  const n = Number(atomic);
  if (!Number.isFinite(n)) return null;
  return n / 10 ** USDC_DECIMALS;
}

export function usdcFromAcceptance(acceptance?: PaymentAcceptance): number | null {
  if (!acceptance) return null;
  return atomicToUsdc(acceptance.amount ?? acceptance.maxAmountRequired);
}

export function cheapestAcceptance(listing: ServiceListing): PaymentAcceptance | undefined {
  if (!listing.accepts?.length) return undefined;
  return [...listing.accepts].sort((a, b) => {
    const aa = atomicToUsdc(a.amount ?? a.maxAmountRequired) ?? Number.POSITIVE_INFINITY;
    const bb = atomicToUsdc(b.amount ?? b.maxAmountRequired) ?? Number.POSITIVE_INFINITY;
    return aa - bb;
  })[0];
}

export function formatUsdc(amount: number | null | undefined, digits = 2): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: Math.max(digits, 6),
  });
}

export function formatUsdPrice(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  if (amount === 0) return "0";
  if (amount > 0 && amount < 0.01) {
    return amount.toFixed(5).replace(/0+$/, "").replace(/\.$/, "");
  }
  return formatUsdc(amount, 3);
}

export function formatUsdPriceLabel(amount: number | null | undefined): string {
  const n = formatUsdPrice(amount);
  return n === "—" ? n : `${n} USDC`;
}

export function serviceName(listing: ServiceListing): string {
  return (
    listing.metadata?.provider?.name ||
    hostnameOf(listing.resource) ||
    "Untitled service"
  );
}

export function serviceDescription(listing: ServiceListing): string {
  return (
    listing.metadata?.description ||
    listing.metadata?.provider?.description ||
    "x402-compatible service"
  );
}

/** Endpoint-specific label — Allium listings share a provider name. */
export function serviceTitle(listing: ServiceListing): string {
  const desc = listing.metadata?.description?.trim();
  if (desc) {
    const headline = headlineFromDescription(desc);
    if (headline) return headline;
  }
  return humanizePath(listing.metadata?.path || pathOf(listing.resource)) || serviceName(listing);
}

export function serviceDetail(listing: ServiceListing): string {
  const method = (listing.metadata?.method ?? "").toUpperCase();
  const path = shortPath(listing.metadata?.path || pathOf(listing.resource));
  return [serviceName(listing), method || null, path || null].filter(Boolean).join(" · ");
}

function headlineFromDescription(desc: string): string {
  let text = desc.split(/[.;]/)[0]?.trim() ?? "";
  text = text.replace(
    /^(retrieve|get|execute|list|look up|search for|return|fetch)(?:\s+(?:the|a|an))?\s+/i,
    "",
  );
  if (text.length > 58) {
    text = `${text.slice(0, 55).replace(/\s+\S*$/, "")}…`;
  }
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function humanizePath(path: string): string {
  const parts = path.split("/").filter((part) => part && !/^(api|v\d+)$/i.test(part));
  const tail = parts.slice(-2);
  if (!tail.length) return "";
  return tail.map((part) => part.replace(/[-_]/g, " ")).join(" / ");
}

function shortPath(path: string): string {
  const cleaned = path.split("?")[0].replace(/^\/?(api\/)?v\d+\//i, "/");
  if (cleaned.length <= 36) return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  const parts = cleaned.split("/").filter(Boolean);
  return `/${parts.slice(-3).join("/")}`;
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

export function categoryLabel(category?: string): string {
  if (!category) return "Service";
  return category
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function parseUsdcInput(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
