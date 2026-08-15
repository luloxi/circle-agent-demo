import { runCircle } from "@/lib/circle-cli";
import { DEMO_FUND_AMOUNT, sleep } from "@/lib/mock-data";
import { getNetwork } from "@/lib/networks";
import { isAddress, readJsonBody, readNetwork, wantsDemo } from "@/lib/request";

export const runtime = "nodejs";

/**
 * Testnet: `circle wallet fund --address --chain` draws from the Circle faucet.
 * Mainnet: we do not move real funds from the UI — we return on-ramp instructions
 * and optionally invoke the CLI with --no-open so the operator can continue.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const demo = wantsDemo({ body });
  const network = getNetwork(readNetwork({ body }));
  const address = typeof body.address === "string" ? body.address.trim() : "";

  if (demo) {
    await sleep(800);
    return Response.json({
      ok: true,
      demo: true,
      method: "faucet",
      addedUsdc: DEMO_FUND_AMOUNT,
      faucetUrl: network.faucetUrl,
      message: `Demo faucet credited ${DEMO_FUND_AMOUNT} USDC.`,
    });
  }

  if (!isAddress(address)) {
    return Response.json({ error: "A valid 0x wallet address is required." }, { status: 400 });
  }

  if (network.environment === "mainnet") {
    return Response.json({
      ok: true,
      demo: false,
      method: "instructions",
      faucetUrl: network.faucetUrl,
      explorer: network.explorerAddress(address),
      commands: [
        `circle wallet fund --address ${address} --chain ${network.cliChain} --amount 10 --token usdc --method crypto --open`,
        `circle wallet fund --address ${address} --chain ${network.cliChain} --amount 10 --token usdc --method fiat --open`,
        `circle gateway balance --address ${address} --chain ${network.cliChain} --output json`,
        `circle gateway deposit --amount 1 --address ${address} --chain BASE --method eco`,
      ],
      message:
        "Mainnet funding is not executed from this UI. Two pools: on-chain (vanilla x402) and Gateway (nanopayments). Eco deposits land on Polygon — then pay with --chain MATIC. Do not deposit 100% of vanilla USDC.",
    });
  }

  const result = await runCircle(
    [
      "wallet",
      "fund",
      "--address",
      address,
      "--chain",
      network.cliChain,
      "--output",
      "json",
    ],
    { timeoutMs: 45_000 },
  );

  if (result.missing) {
    return Response.json(
      {
        ok: true,
        demo: false,
        method: "instructions",
        faucetUrl: network.faucetUrl,
        commands: [
          `circle wallet fund --address ${address} --chain ${network.cliChain}`,
        ],
        message:
          "Circle CLI is not installed. Fund on testnet from a terminal after installing `@circle-fin/cli`, or use the Circle faucet.",
        demoSuggested: true,
      },
      { status: 200 },
    );
  }

  return Response.json({
    ok: result.ok,
    demo: false,
    method: "faucet",
    faucetUrl: network.faucetUrl,
    message: result.ok
      ? "Faucet request submitted via Circle CLI."
      : result.stderr || result.stdout || "Faucet request failed.",
    raw: result.parsed ?? result.stdout,
  });
}
