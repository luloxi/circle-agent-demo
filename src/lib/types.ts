/**
 * Shared types for the Agent Pay Demo.
 *
 * Shapes follow Circle's public Discovery API
 * (GET https://api.circle.com/v2/x402/discovery/resources)
 * plus the Circle CLI JSON surfaces we parse server-side.
 */

export type NetworkId = "ARC-TESTNET" | "BASE";

export type Environment = "testnet" | "mainnet";

export type ServiceCategory =
  | "SOCIAL_INTELLIGENCE"
  | "FINANCIAL_ANALYSIS"
  | "WEB_SEARCH_RESEARCH"
  | "PREDICTION_MARKETS"
  | "CREATIVE"
  | "INFRASTRUCTURE"
  | "DATA_ENRICHMENT"
  | string;

export type ProtocolType = "http" | "mcp" | string;

export interface PaymentAcceptance {
  scheme: string;
  network: string;
  asset: string;
  /** Atomic units. USDC has 6 decimals — "10000" = 0.01 USDC. */
  amount?: string;
  /** v1 listings used this instead of `amount`. */
  maxAmountRequired?: string;
  payTo: string;
  extra?: {
    name?: string;
    version?: string;
    verifyingContract?: string;
  };
}

export interface ServiceProvider {
  name: string;
  description?: string;
  category?: ServiceCategory;
  tags?: string[];
  website?: string;
  docsUrl?: string;
  openApiUrl?: string;
}

export interface ServiceMetadata {
  provider?: ServiceProvider;
  path?: string;
  method?: string;
  description?: string;
  mimeType?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  siwx?: boolean;
  supportsVanillax402?: boolean;
  supportsCircleGateway?: boolean;
}

export interface ServiceListing {
  resource: string;
  type: ProtocolType;
  x402Version?: number;
  lastUpdated?: string;
  accepts: PaymentAcceptance[];
  metadata?: ServiceMetadata;
}

export interface DiscoveryResponse {
  x402Version: number;
  items: ServiceListing[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface WalletInfo {
  address: string;
  chain: string;
  type?: string;
  email?: string;
}

export interface CliStatus {
  installed: boolean;
  version: string | null;
  path: string | null;
}

export interface TermsInfo {
  accepted: boolean;
  currentVersion?: string;
  termsOfUseUrl?: string;
  privacyPolicyUrl?: string;
  termsNotice?: string;
}

export interface WalletStatusPayload {
  demo: boolean;
  cli: CliStatus;
  terms: TermsInfo | null;
  authenticated: boolean;
  email: string | null;
  wallets: WalletInfo[];
  wallet: WalletInfo | null;
  balanceUsdc: number | null;
  /** Nanopayments / Gateway pool (separate from on-chain vanilla USDC). */
  gatewayBalanceUsdc?: number | null;
  needsAuth: boolean;
  needsTerms: boolean;
  hint: string | null;
}

export interface InspectResult {
  url: string;
  method: string;
  description?: string;
  accepts: PaymentAcceptance[];
  metadata?: ServiceMetadata;
  priceUsdc: number | null;
  supportsCircleGateway: boolean;
  supportsVanillax402: boolean;
  /** CLI `--chain` chosen from accepts[] (never guessed). */
  preferredChain?: string | null;
  source: "discovery" | "cli" | "demo";
  raw?: unknown;
}

export interface PayResult {
  ok: boolean;
  demo: boolean;
  url: string;
  chain: string;
  address: string;
  amountUsdc: number;
  status: number;
  paid: boolean;
  response: unknown;
  error?: string;
  hint?: string;
  estimated?: boolean;
  fundsMayHaveMoved?: boolean;
  method?: string;
  gatewayOnboard?: { amount: number; chain: string };
}

export type LogLevel = "info" | "ok" | "warn" | "error" | "pay" | "search";

export interface ActivityEntry {
  id: string;
  ts: number;
  level: LogLevel;
  action: string;
  message: string;
}

export interface ApiErrorBody {
  error: string;
  hint?: string;
  demoSuggested?: boolean;
  needsAuth?: boolean;
  needsTerms?: boolean;
  terms?: TermsInfo;
  cliInstalled?: boolean;
}

export type StepStatus = "pending" | "running" | "completed" | "error" | "skipped";

export type QualityTier = "economy" | "standard" | "premium";

export interface FlowStepAlternative {
  listing: ServiceListing;
  priceUsdc: number;
  quality: QualityTier;
  label: string;
  note: string;
}

export interface FlowStep {
  id: string;
  title: string;
  intent: string;
  role: string;
  listing: ServiceListing;
  priceUsdc: number;
  quality: QualityTier;
  status: StepStatus;
  alternatives: FlowStepAlternative[];
  result?: unknown;
  excerpt?: string;
  error?: string;
  paidUsdc?: number;
}

export interface QueryPlan {
  id: string;
  title: string;
  prompt: string;
  source: "preset" | "composer";
  presetId?: string;
  steps: FlowStep[];
  estimatedTotal: number;
  spentTotal: number;
  assembled?: AssembledResult;
  note?: string;
}

export interface AssembledResult {
  headline: string;
  summary: string;
  sections: { heading: string; body: string; bullets?: string[] }[];
  sources?: { title: string; url?: string }[];
}

export interface QueryHistoryItem {
  id: string;
  title: string;
  prompt: string;
  spentUsdc: number;
  estimatedUsdc: number;
  stepCount: number;
  ts: number;
  ok: boolean;
}

export interface PresetCard {
  id: string;
  title: string;
  tagline: string;
  prompt: string;
  accent: string;
  serviceLabels: string[];
  estimatedUsdc: number;
}
