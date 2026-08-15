import { parseBalanceUsdc, runCircle } from "@/lib/circle-cli";
import { DEMO_STARTING_BALANCE, sleep } from "@/lib/mock-data";
import { getNetwork } from "@/lib/networks";
import { isAddress, readNetwork, wantsDemo } from "@/lib/request";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const demo = wantsDemo({ searchParams });
  const network = getNetwork(readNetwork({ searchParams }));
  const address = searchParams.get("address") ?? "";
  const override = searchParams.get("demoBalance");

  if (demo) {
    await sleep(350);
    const balanceUsdc =
      override != null && Number.isFinite(Number(override))
        ? Number(override)
        : DEMO_STARTING_BALANCE;
    return Response.json({
      demo: true,
      address: address || "0xA93d4E8c1B7f2a90C6eD4b8F0A12E9d5C3f2C1a4",
      chain: network.cliChain,
      balanceUsdc,
    });
  }

  if (!isAddress(address)) {
    return Response.json({ error: "A valid 0x wallet address is required." }, { status: 400 });
  }

  const result = await runCircle(
    [
      "wallet",
      "balance",
      "--address",
      address,
      "--chain",
      network.cliChain,
      "--output",
      "json",
    ],
    { timeoutMs: 15_000 },
  );

  if (result.missing) {
    return Response.json(
      {
        error: "Circle CLI is not installed.",
        demoSuggested: true,
      },
      { status: 503 },
    );
  }

  if (!result.ok) {
    return Response.json(
      { error: result.stderr || result.stdout || "Failed to read balance." },
      { status: 502 },
    );
  }

  return Response.json({
    demo: false,
    address,
    chain: network.cliChain,
    balanceUsdc: parseBalanceUsdc(result.parsed, result.stdout),
    raw: result.parsed ?? result.stdout,
  });
}
