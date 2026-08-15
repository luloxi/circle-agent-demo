import type { Environment, NetworkId } from "@/lib/types";

export type { NetworkId };

export type AppMode = "demo" | NetworkId;

export interface NetworkConfig {
  id: NetworkId;
  label: string;
  shortLabel: string;
  environment: Environment;
  /** Value passed to Circle CLI `--chain`. */
  cliChain: string;
  /**
   * Discovery API `network` filter. Prefers the legacy SDK name
   * (base) documented by Circle; Arc Testnet is the Agent Stack default.
   */
  discoveryNetwork: string;
  caip2: string;
  explorerAddress: (address: string) => string;
  faucetUrl: string;
  faucetLabel: string;
  /** Discovery currently lists payable x402 sellers on this network. */
  marketplaceLive: boolean;
  chainId: number;
  usdcAddress: string;
  nativeSymbol: string;
}

export const NETWORKS: Record<NetworkId, NetworkConfig> = {
  "ARC-TESTNET": {
    id: "ARC-TESTNET",
    label: "Arc Testnet",
    shortLabel: "Arc Testnet",
    environment: "testnet",
    cliChain: "ARC-TESTNET",
    discoveryNetwork: "arc-testnet",
    caip2: "eip155:5042002",
    explorerAddress: (address) =>
      `https://testnet.arcscan.app/address/${address}`,
    faucetUrl: "https://faucet.circle.com",
    faucetLabel: "Circle faucet",
    marketplaceLive: false,
    chainId: 5042002,
    usdcAddress: "0x3600000000000000000000000000000000000000",
    nativeSymbol: "USDC",
  },
  BASE: {
    id: "BASE",
    label: "Base",
    shortLabel: "Base Mainnet",
    environment: "mainnet",
    cliChain: "BASE",
    discoveryNetwork: "base",
    caip2: "eip155:8453",
    explorerAddress: (address) => `https://basescan.org/address/${address}`,
    faucetUrl: "https://faucet.circle.com",
    faucetLabel: "Circle faucet",
    marketplaceLive: true,
    chainId: 8453,
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    nativeSymbol: "ETH",
  },
};

export function usdcTransferUri(network: NetworkConfig, address: string): string {
  return `ethereum:${network.usdcAddress}@${network.chainId}/transfer?address=${address}`;
}

export function nativeTransferUri(network: NetworkConfig, address: string): string {
  return `ethereum:${address}@${network.chainId}`;
}

export const DEFAULT_NETWORK: NetworkId = "ARC-TESTNET";

export const NETWORK_LIST: NetworkConfig[] = [
  NETWORKS["ARC-TESTNET"],
  NETWORKS.BASE,
];

export const LIVE_CATALOG_NETWORKS = NETWORK_LIST.filter((item) => item.marketplaceLive);

export function isNetworkId(value: string): value is NetworkId {
  return value === "ARC-TESTNET" || value === "BASE";
}

export function getNetwork(id: string | null | undefined): NetworkConfig {
  if (id && isNetworkId(id)) return NETWORKS[id];
  return NETWORKS[DEFAULT_NETWORK];
}

/** Catalog fetch args for a header mode change — never reuse the previous mode. */
export function searchRequestForMode(
  mode: AppMode,
  currentNetwork: NetworkId,
): { demo: boolean; chain: NetworkId } {
  if (mode === "demo") return { demo: true, chain: currentNetwork };
  return { demo: false, chain: mode };
}
