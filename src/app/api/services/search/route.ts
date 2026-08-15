import { searchServicesSafe } from "@/lib/discovery";
import { filterMockServices, sleep } from "@/lib/mock-data";
import { getNetwork } from "@/lib/networks";
import { readNetwork, wantsDemo } from "@/lib/request";

export const runtime = "nodejs";

/**
 * Marketplace search.
 *
 * Prefers the public Discovery API (no API key). Demo Mode returns fixtures
 * so the booth always has services to click even without network access.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const demo = wantsDemo({ searchParams });
  const network = getNetwork(readNetwork({ searchParams }));
  const query = searchParams.get("query") ?? searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const limit = Number(searchParams.get("limit") ?? "24") || 24;

  if (demo) {
    await sleep(420);
    const data = filterMockServices({
      query,
      category: category || undefined,
      limit,
    });
    return Response.json({
      ...data,
      source: "demo",
      network: network.id,
    });
  }

  const { data, source, note } = await searchServicesSafe({
    query: query || undefined,
    category: category || undefined,
    network: network.discoveryNetwork,
    limit,
  });

  return Response.json({
    ...data,
    source,
    note,
    network: network.id,
  });
}
