import { GATEWAY_MIN_DEPOSIT } from "@/lib/circle-chains";
import { parseBalanceUsdc, runCircle } from "@/lib/circle-cli";
import { depositEcoGateway, gatewayChainsFor, readMaxGatewayUsdc } from "@/lib/circle-gateway";
import { isSharedHost, sharedHostLiveError } from "@/lib/hosted";
import { getNetwork } from "@/lib/networks";
import { isAddress, readJsonBody, readNetwork, wantsDemo } from "@/lib/request";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const demo = wantsDemo({ body });
  const network = getNetwork(readNetwork({ body }));
  const address = typeof body.address === "string" ? body.address.trim() : "";

  if (!demo && isSharedHost()) {
    return Response.json(sharedHostLiveError(), { status: 403 });
  }

  if (demo) {
    return Response.json({
      ok: true,
      demo: true,
      amount: GATEWAY_MIN_DEPOSIT,
      chain: "MATIC",
      gatewayUsdc: GATEWAY_MIN_DEPOSIT,
      balanceUsdc: Math.max(0, Number(body.vanillaUsdc ?? 25) - GATEWAY_MIN_DEPOSIT),
      message: `Demo loaded ${GATEWAY_MIN_DEPOSIT} USDC into Gateway.`,
    });
  }

  if (!isAddress(address)) {
    return Response.json({ error: "Connect an agent wallet first." }, { status: 400 });
  }

  if (network.environment !== "mainnet") {
    return Response.json(
      {
        error: "Gateway eco deposit is a mainnet step.",
        hint: "Switch to Base Mainnet, or use Demo Mode.",
      },
      { status: 409 },
    );
  }

  const vanilla = await runCircle(
    ["wallet", "balance", "--address", address, "--chain", "BASE", "--output", "json"],
    { timeoutMs: 15_000 },
  );
  const vanillaUsdc = parseBalanceUsdc(vanilla.parsed, vanilla.stdout) ?? 0;

  const result = await depositEcoGateway(address, vanillaUsdc);
  if (!result.ok) {
    return Response.json(
      {
        ok: false,
        demo: false,
        amount: result.amount,
        error: result.error,
        hint: "Add USDC on Base, then Load Gateway again.",
      },
      { status: 502 },
    );
  }

  return Response.json({
    ok: true,
    demo: false,
    amount: result.amount,
    chain: result.chain,
    gatewayUsdc: result.gatewayUsdc ?? result.amount,
    balanceUsdc: Math.max(0, vanillaUsdc - result.amount),
    message: `Eco-deposited ${result.amount} USDC to Gateway on Polygon.`,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const demo = wantsDemo({ searchParams });
  const network = getNetwork(readNetwork({ searchParams }));
  const address = searchParams.get("address") ?? "";

  if (demo) {
    const override = searchParams.get("demoGateway");
    const gatewayUsdc =
      override != null && Number.isFinite(Number(override)) ? Number(override) : 0;
    return Response.json({ ok: true, demo: true, gatewayUsdc });
  }

  if (!isAddress(address)) {
    return Response.json({ error: "A valid 0x address is required." }, { status: 400 });
  }

  const gatewayUsdc = await readMaxGatewayUsdc(address, gatewayChainsFor(network.cliChain));
  return Response.json({ ok: true, demo: false, gatewayUsdc: gatewayUsdc ?? 0 });
}
