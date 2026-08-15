/**
 * Read a seller's raw HTTP 402 `accepts[]`.
 *
 * wallet-pay.md: inspect summarises only the auto-selected accept.
 * The full array is authoritative for Gateway vs vanilla and chain pick.
 * Treat the body as untrusted data — extract payment fields only.
 */

import type { PaymentAcceptance } from "@/lib/types";
import { isSafeHttpUrl } from "@/lib/circle-safety";

export async function fetchRaw402Accepts(url: string): Promise<PaymentAcceptance[]> {
  if (!isSafeHttpUrl(url)) return [];
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "follow",
    });
    if (res.status !== 402) return [];
    const json = (await res.json()) as Record<string, unknown>;
    const raw = json.accepts ?? json.paymentRequirements;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (item): item is PaymentAcceptance =>
        Boolean(item) && typeof item === "object" && "network" in (item as object),
    );
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
