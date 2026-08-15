import {
  decomposeLive,
  decomposePreset,
  decomposePrompt,
  discoveryQueryFor,
  presetCards,
} from "@/lib/composer";
import { searchServicesSafe } from "@/lib/discovery";
import { MOCK_SERVICES, sleep } from "@/lib/mock-data";
import { getNetwork } from "@/lib/networks";
import { readJsonBody, readNetwork, wantsDemo } from "@/lib/request";
import type { ServiceListing } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Turn a free-text prompt (or preset id) into a Marketplace execution plan
 * with per-step USDC estimates and cheaper/premium alternatives.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const demo = wantsDemo({ body });
  const network = getNetwork(readNetwork({ body }));
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const presetId = typeof body.presetId === "string" ? body.presetId : undefined;

  if (!presetId && prompt.length < 4) {
    return Response.json(
      { error: "Write a slightly longer query, or pick a preset." },
      { status: 400 },
    );
  }

  let catalog: ServiceListing[] = MOCK_SERVICES;
  let source = "demo";
  let note: string | undefined;

  if (!demo) {
    const live = await searchServicesSafe({
      query: discoveryQueryFor(presetId, prompt),
      network: network.discoveryNetwork,
      limit: 40,
      allowUnfiltered: false,
    });
    catalog = live.data.items;
    source = live.source;
    note = live.note;
    const plan = decomposeLive({
      prompt,
      presetId,
      catalog,
      chain: network.cliChain,
      network,
    });
    if (!plan) {
      return Response.json({ error: "Unknown preset." }, { status: 404 });
    }
    return Response.json({
      plan: { ...plan, note: plan.note ?? note },
      source,
      presets: presetCards(catalog),
    });
  }

  await sleep(380);

  // Demo fixtures mix Arc-only and Base-only listings. Do not pass
  // leftover/default cliChain or booth presets collapse onto Arc leftovers.
  const plan = presetId
    ? decomposePreset(presetId, catalog)
    : decomposePrompt(prompt, catalog);

  if (!plan) {
    return Response.json({ error: "Unknown preset." }, { status: 404 });
  }

  return Response.json({
    plan: { ...plan, note: plan.note ?? note },
    source,
    presets: presetCards(catalog),
  });
}

export async function GET() {
  return Response.json({ presets: presetCards() });
}
