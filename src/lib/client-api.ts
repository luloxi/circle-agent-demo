import type {
  ApiErrorBody,
  CliStatus,
  InspectResult,
  PayResult,
  PresetCard,
  QueryPlan,
  ServiceListing,
  TermsInfo,
  WalletStatusPayload,
} from "@/lib/types";
import type { NetworkId } from "@/lib/types";

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;

  constructor(message: string, status: number, body: ApiErrorBody) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  const json = (await res.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!res.ok) {
    throw new ApiError(
      json.error || res.statusText || "Request failed",
      res.status,
      json,
    );
  }
  return json;
}

export function withDemo(demo: boolean): string {
  return demo ? "true" : "false";
}

export const api = {
  cliStatus: () => request<CliStatus & { hint?: string }>("/api/cli/status"),

  walletStatus: (demo: boolean, chain: NetworkId) =>
    request<WalletStatusPayload>(
      `/api/wallet/status?demo=${withDemo(demo)}&chain=${chain}`,
    ),

  connect: (demo: boolean, chain: NetworkId) =>
    request<WalletStatusPayload>("/api/wallet/connect", {
      method: "POST",
      body: JSON.stringify({ demo, chain }),
    }),

  loginInit: (email: string, chain: NetworkId) =>
    request<{ ok: boolean; requestId: string | null; email: string; message: string }>(
      "/api/wallet/login",
      { method: "POST", body: JSON.stringify({ step: "init", email, chain }) },
    ),

  loginComplete: (requestId: string, otp: string, chain: NetworkId) =>
    request<{ ok: boolean; message: string }>("/api/wallet/login", {
      method: "POST",
      body: JSON.stringify({ step: "complete", requestId, otp, chain }),
    }),

  terms: () => request<TermsInfo>("/api/wallet/terms"),

  acceptTerms: () =>
    request<{ ok: boolean; terms: TermsInfo }>("/api/wallet/terms", {
      method: "POST",
      body: JSON.stringify({ accept: true }),
    }),

  balance: (demo: boolean, chain: NetworkId, address: string, demoBalance?: number) => {
    const qs = new URLSearchParams({
      demo: withDemo(demo),
      chain,
      address,
    });
    if (demoBalance != null) qs.set("demoBalance", String(demoBalance));
    return request<{ balanceUsdc: number | null }>(`/api/wallet/balance?${qs}`);
  },

  fund: (demo: boolean, chain: NetworkId, address: string) =>
    request<{
      ok: boolean;
      demo: boolean;
      method: string;
      addedUsdc?: number;
      faucetUrl?: string;
      message: string;
      commands?: string[];
    }>("/api/wallet/fund", {
      method: "POST",
      body: JSON.stringify({ demo, chain, address }),
    }),

  search: (opts: {
    demo: boolean;
    chain: NetworkId;
    query: string;
    category?: string;
  }) => {
    const qs = new URLSearchParams({
      demo: withDemo(opts.demo),
      chain: opts.chain,
      query: opts.query,
      limit: "24",
    });
    if (opts.category) qs.set("category", opts.category);
    return request<{
      items: ServiceListing[];
      pagination: { total: number; limit: number; offset: number };
      source: string;
      note?: string;
    }>(`/api/services/search?${qs}`);
  },

  inspect: (demo: boolean, url: string) =>
    request<InspectResult>("/api/services/inspect", {
      method: "POST",
      body: JSON.stringify({ demo, url }),
    }),

  pay: (opts: {
    demo: boolean;
    chain: NetworkId;
    url: string;
    address: string;
    maxAmount: number;
    method?: string;
    estimate?: boolean;
  }) =>
    request<PayResult>("/api/services/pay", {
      method: "POST",
      body: JSON.stringify(opts),
    }),

  decompose: (opts: {
    demo: boolean;
    chain: NetworkId;
    prompt?: string;
    presetId?: string;
  }) =>
    request<{ plan: QueryPlan; source: string; presets: PresetCard[] }>(
      "/api/composer/decompose",
      { method: "POST", body: JSON.stringify(opts) },
    ),

  presets: () => request<{ presets: PresetCard[] }>("/api/composer/decompose"),
};
