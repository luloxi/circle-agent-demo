import type { Environment, NetworkId } from "@/lib/types";

export type { NetworkId };

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
  },
};

export const DEFAULT_NETWORK: NetworkId = "ARC-TESTNET";

export const NETWORK_LIST: NetworkConfig[] = [
  NETWORKS["ARC-TESTNET"],
  NETWORKS.BASE,
];

export function isNetworkId(value: string): value is NetworkId {
  return value === "ARC-TESTNET" || value === "BASE";
}

export function getNetwork(id: string | null | undefined): NetworkConfig {
  if (id && isNetworkId(id)) return NETWORKS[id];
  return NETWORKS[DEFAULT_NETWORK];
}
