/**
 * Circle Gateway pool — eco deposit + balance read.
 * Eco moves BASE vanilla USDC to Polygon Gateway (official buyer path).
 */

import { GATEWAY_MIN_DEPOSIT, sizeEcoDeposit } from "@/lib/circle-chains";
import { parseBalanceUsdc, runCircle } from "@/lib/circle-cli";

export function gatewayChainsFor(cliChain: string): string[] {
  const chains = [cliChain];
  if (cliChain === "BASE") chains.push("MATIC");
  if (cliChain === "BASE-SEPOLIA") chains.push("MATIC-AMOY");
  return [...new Set(chains)];
}

export function gatewayNeedsLoad(gatewayUsdc: number | null | undefined): boolean {
  return (gatewayUsdc ?? 0) + 1e-9 < GATEWAY_MIN_DEPOSIT;
}

export async function readMaxGatewayUsdc(
  address: string,
  chains: string[],
): Promise<number | null> {
  const rows = await Promise.all(
    chains.map(async (chain) => {
      const result = await runCircle(
        ["gateway", "balance", "--address", address, "--chain", chain, "--output", "json"],
        { timeoutMs: 12_000 },
      );
      if (!result.ok) return null;
      return parseBalanceUsdc(result.parsed, result.stdout);
    }),
  );
  const nums = rows.filter((n): n is number => n != null);
  if (!nums.length) return 0;
  return Math.max(...nums);
}

export async function depositEcoGateway(
  address: string,
  vanillaUsdc: number,
  priceUsdc = 0,
): Promise<{
  ok: boolean;
  amount: number;
  chain: "MATIC";
  gatewayUsdc: number | null;
  error?: string;
  stdout?: string;
}> {
  const amount = sizeEcoDeposit(vanillaUsdc, priceUsdc);
  if (amount == null) {
    return {
      ok: false,
      amount: GATEWAY_MIN_DEPOSIT,
      chain: "MATIC",
      gatewayUsdc: null,
      error: `Need at least ${GATEWAY_MIN_DEPOSIT} USDC on Base (and a little left over) to load Gateway.`,
    };
  }

  const deposit = await runCircle(
    [
      "gateway",
      "deposit",
      "--amount",
      String(amount),
      "--address",
      address,
      "--chain",
      "BASE",
      "--method",
      "eco",
      "--timeout",
      "90",
      "--output",
      "json",
    ],
    { timeoutMs: 110_000 },
  );

  if (!deposit.ok) {
    return {
      ok: false,
      amount,
      chain: "MATIC",
      gatewayUsdc: null,
      error: deposit.stderr || deposit.stdout || "Gateway eco deposit failed.",
      stdout: deposit.stdout,
    };
  }

  let gatewayUsdc: number | null = null;
  for (let i = 0; i < 4; i++) {
    gatewayUsdc = await readMaxGatewayUsdc(address, ["MATIC", "BASE"]);
    if ((gatewayUsdc ?? 0) + 1e-9 >= amount * 0.5) break;
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }

  return { ok: true, amount, chain: "MATIC", gatewayUsdc };
}
