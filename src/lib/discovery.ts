/**
 * Public Circle Discovery API client.
 *
 * GET https://api.circle.com/v2/x402/discovery/resources
 * No API key, no account. Used for marketplace search even when the
 * Circle CLI is not installed.
 */

import type { DiscoveryResponse, ServiceListing } from "@/lib/types";
import { filterMockServices } from "@/lib/mock-data";

export const DISCOVERY_URL = "https://api.circle.com/v2/x402/discovery/resources";

export interface SearchParams {
  query?: string;
  category?: string;
  network?: string;
  type?: string;
  limit?: number;
  offset?: number;
  maxUsdPrice?: number;
  supportsCircleGateway?: boolean;
}

export async function searchDiscovery(
  params: SearchParams,
): Promise<DiscoveryResponse> {
  const url = new URL(DISCOVERY_URL);
  if (params.query) url.searchParams.set("query", params.query);
  if (params.category) url.searchParams.set("category", params.category);
  if (params.network) url.searchParams.set("network", params.network);
  if (params.type) url.searchParams.set("type", params.type);
  url.searchParams.set("limit", String(params.limit ?? 24));
  url.searchParams.set("offset", String(params.offset ?? 0));
  url.searchParams.set("siwx", "false");
  if (params.maxUsdPrice != null) {
    url.searchParams.set("maxUsdPrice", String(params.maxUsdPrice));
  }
  if (params.supportsCircleGateway) {
    url.searchParams.set("supportsCircleGateway", "true");
  }

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "AgentPayDemo/1.0",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Discovery API ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as Partial<DiscoveryResponse> & {
    resources?: ServiceListing[];
  };

  const items = Array.isArray(json.items)
    ? json.items
    : Array.isArray(json.resources)
      ? json.resources
      : [];

  return {
    x402Version: json.x402Version ?? 2,
    items,
    pagination: json.pagination ?? {
      limit: params.limit ?? 24,
      offset: params.offset ?? 0,
      total: items.length,
    },
  };
}

/**
 * Search the live catalog, falling back to fixtures if the network is
 * unreachable. Empty network-filtered results retry without the filter
 * so the UI still has something to show on a live demo.
 */
export async function searchServicesSafe(
  params: SearchParams,
): Promise<{ data: DiscoveryResponse; source: "discovery" | "mock"; note?: string }> {
  try {
    const first = await searchDiscovery(params);
    if (first.items.length === 0 && params.network) {
      const retry = await searchDiscovery({
        query: params.query,
        category: params.category,
        type: params.type,
        limit: params.limit,
        offset: params.offset,
        maxUsdPrice: params.maxUsdPrice,
        supportsCircleGateway: params.supportsCircleGateway,
      });
      if (retry.items.length > 0) {
        return {
          data: retry,
          source: "discovery",
          note: `No listings advertised ${params.network}; showing the broader catalog.`,
        };
      }
    }
    return { data: first, source: "discovery" };
  } catch (err) {
    const data = filterMockServices({
      query: params.query,
      category: params.category,
      limit: params.limit,
    });
    return {
      data,
      source: "mock",
      note: `Discovery API unavailable (${err instanceof Error ? err.message : "error"}). Showing local fixtures.`,
    };
  }
}
