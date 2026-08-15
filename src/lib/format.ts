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
