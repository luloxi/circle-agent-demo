import { isGatewayAcceptance, pickPayChain } from "@/lib/circle-chains";
import { runCircle } from "@/lib/circle-cli";
import { isSafeHttpUrl, normalizeMethod } from "@/lib/circle-safety";
import { searchDiscovery } from "@/lib/discovery";
import {
  cheapestAcceptance,
  usdcFromAcceptance,
} from "@/lib/format";
import { fetchRaw402Accepts, mergeAccepts } from "@/lib/circle-x402";
import { mockInspect, sleep } from "@/lib/mock-data";
import { readJsonBody, wantsDemo } from "@/lib/request";
import type { InspectResult, PaymentAcceptance, ServiceListing } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const demo = wantsDemo({ body });
  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!isSafeHttpUrl(url)) {
    return Response.json({ error: "A valid http(s) service URL is required." }, { status: 400 });
  }

  if (demo) {
    await sleep(480);
    return Response.json(mockInspect(url));
  }

  // Prefer listing metadata from Discovery (public, no CLI).
  let listing: ServiceListing | undefined;
  try {
    const discovered = await searchDiscovery({ query: url, limit: 10 });
    listing =
      discovered.items.find((item) => item.resource === url) ?? discovered.items[0];
  } catch {
    listing = undefined;
  }

  const listingResult = listing ? listingToInspect(listing, "discovery") : null;

  const cli = await runCircle(["services", "inspect", url, "--output", "json"], {
    timeoutMs: 20_000,
  });

  const raw402 = await fetchRaw402Accepts(url);

  if (cli.ok && cli.parsed) {
    const fromCli = inspectFromCli(url, cli.parsed, listing);
    const accepts = mergeAccepts(fromCli.accepts, raw402);
    return Response.json({
      ...fromCli,
      accepts,
      preferredChain: pickPayChain(accepts)?.chain ?? fromCli.preferredChain,
    });
  }

  if (listingResult) {
    return Response.json({
      ...listingResult,
      raw: listing,
      hint: cli.missing
        ? "Inspected from Discovery metadata. Install Circle CLI for `circle services inspect`."
        : cli.stderr || undefined,
    });
  }

  if (cli.missing) {
    return Response.json(
      {
        error: "No Discovery listing found and Circle CLI is not installed.",
        hint: "Enable Demo Mode, or install `@circle-fin/cli`.",
        demoSuggested: true,
      },
      { status: 503 },
    );
  }

  return Response.json(
    {
      error: cli.stderr || cli.stdout || "Inspect failed.",
    },
    { status: 502 },
  );
}

function listingToInspect(
  listing: ServiceListing,
  source: InspectResult["source"],
): InspectResult {
  const cheapest = cheapestAcceptance(listing);
  const picked = pickPayChain(listing.accepts ?? []);
  return {
    url: listing.resource,
    method: normalizeMethod(listing.metadata?.method),
    description: listing.metadata?.description,
    accepts: listing.accepts ?? [],
    metadata: listing.metadata,
    priceUsdc: usdcFromAcceptance(cheapest),
    supportsCircleGateway:
      listing.metadata?.supportsCircleGateway ??
      (listing.accepts ?? []).some(isGatewayAcceptance),
    supportsVanillax402:
      listing.metadata?.supportsVanillax402 ??
      (listing.accepts ?? []).some((a) => !isGatewayAcceptance(a)),
    preferredChain: picked?.chain ?? null,
    source,
    raw: listing,
  };
}

function inspectFromCli(
  url: string,
  parsed: unknown,
  listing?: ServiceListing,
): InspectResult {
  const rec =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  const data =
    rec.data && typeof rec.data === "object"
      ? (rec.data as Record<string, unknown>)
      : rec;

  const accepts = Array.isArray(data.accepts)
    ? (data.accepts as PaymentAcceptance[])
    : listing?.accepts ?? [];
  const cheapest = accepts[0];

  return {
    url,
    method: normalizeMethod(
      (typeof data.method === "string" && data.method) || listing?.metadata?.method,
    ),
    description:
      (typeof data.description === "string" && data.description) ||
      listing?.metadata?.description,
    accepts,
    metadata: listing?.metadata,
    priceUsdc:
      usdcFromAcceptance(cheapest) ??
      (listing ? usdcFromAcceptance(cheapestAcceptance(listing)) : null),
    supportsCircleGateway:
      listing?.metadata?.supportsCircleGateway ??
      (Boolean(data.supportsCircleGateway) || accepts.some(isGatewayAcceptance)),
    supportsVanillax402:
      listing?.metadata?.supportsVanillax402 ??
      (Boolean(data.supportsVanillax402) ||
        accepts.some((a) => !isGatewayAcceptance(a))),
    preferredChain: pickPayChain(accepts)?.chain ?? null,
    source: "cli",
    raw: parsed,
  };
}
