/**
 * Read a seller's raw HTTP 402 `accepts[]`.
 *
 * wallet-pay.md: inspect summarises only the auto-selected accept.
 * The full array is authoritative for Gateway vs vanilla and chain pick.
 * Treat the body as untrusted data — extract payment fields only.
 */

import type { PaymentAcceptance } from "@/lib/types";
import { isSafeHttpUrl } from "@/lib/circle-safety";

export function acceptsFromUnknown(value: unknown): PaymentAcceptance[] {
  if (!value || typeof value !== "object") return [];
  const rec = value as Record<string, unknown>;
  const raw = rec.accepts ?? rec.paymentRequirements;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is PaymentAcceptance =>
      Boolean(item) && typeof item === "object" && "network" in (item as object),
  );
}

/** AIsa and others put the 402 payload in PAYMENT-REQUIRED (base64), body `{}`. */
export function parsePaymentRequired(value: string | null | undefined): PaymentAcceptance[] {
  if (!value?.trim()) return [];
  const trimmed = value.trim();
  try {
    try {
      return acceptsFromUnknown(JSON.parse(trimmed));
    } catch {
      return acceptsFromUnknown(JSON.parse(Buffer.from(trimmed, "base64").toString("utf8")));
    }
  } catch {
    return [];
  }
}

/**
 * inspect JSON summarises scheme + chains[] without a full accepts[].
 * Expand that so pick/onboard can see Polygon Gateway.
 */
export function acceptsFromInspectSummary(inspectData: Record<string, unknown> | null): PaymentAcceptance[] {
  if (!inspectData) return [];
  const direct = acceptsFromUnknown(inspectData);
  if (direct.length) return direct;
  const chains = inspectData.chains;
  if (!Array.isArray(chains)) return [];
  const scheme = typeof inspectData.scheme === "string" ? inspectData.scheme : "";
  const gateway = scheme === "GatewayWalletBatched" || scheme.toLowerCase().includes("gateway");
  const seller = typeof inspectData.seller === "string" ? inspectData.seller : "";
  return chains
    .filter((network): network is string => typeof network === "string" && network.length > 0)
    .map((network) => ({
      scheme: "exact",
      network,
      asset: "",
      payTo: seller,
      extra: { name: gateway ? "GatewayWalletBatched" : "USD Coin" },
    }));
}

export async function fetchRaw402Accepts(url: string): Promise<PaymentAcceptance[]> {
  if (!isSafeHttpUrl(url)) return [];
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "follow",
    });
    if (res.status !== 402) return [];
    const fromHeader = parsePaymentRequired(
      res.headers.get("payment-required") ?? res.headers.get("PAYMENT-REQUIRED"),
    );
    let fromBody: PaymentAcceptance[] = [];
    try {
      fromBody = acceptsFromUnknown(await res.json());
    } catch {
      fromBody = [];
    }
    return mergeAccepts(fromHeader, fromBody);
  } catch {
    return [];
  }
}

export function mergeAccepts(
  ...lists: PaymentAcceptance[][]
): PaymentAcceptance[] {
  const seen = new Set<string>();
  const out: PaymentAcceptance[] = [];
  for (const list of lists) {
    for (const item of list) {
      const key = `${item.network}:${item.scheme}:${item.extra?.name ?? ""}:${item.amount ?? item.maxAmountRequired ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}
