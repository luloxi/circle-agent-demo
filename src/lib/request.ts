import { isNetworkId } from "@/lib/networks";
import type { NetworkId } from "@/lib/types";

export function wantsDemo(input: {
  searchParams?: URLSearchParams;
  body?: Record<string, unknown> | null;
}): boolean {
  const fromQuery = input.searchParams?.get("demo");
  if (fromQuery === "1" || fromQuery === "true") return true;
  if (fromQuery === "0" || fromQuery === "false") return false;
  const fromBody = input.body?.demo;
  if (fromBody === true || fromBody === "true" || fromBody === 1) return true;
  if (fromBody === false || fromBody === "false" || fromBody === 0) return false;
  return false;
}

export function readNetwork(input: {
  searchParams?: URLSearchParams;
  body?: Record<string, unknown> | null;
}): NetworkId {
  const raw =
    (typeof input.body?.chain === "string" && input.body.chain) ||
    (typeof input.body?.network === "string" && input.body.network) ||
    input.searchParams?.get("chain") ||
    input.searchParams?.get("network") ||
    "ARC-TESTNET";
  return isNetworkId(raw) ? raw : "ARC-TESTNET";
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const json = await request.json();
    if (json && typeof json === "object" && !Array.isArray(json)) {
      return json as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}
