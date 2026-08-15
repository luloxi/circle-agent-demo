import {
  classifyPayFailure,
  cliChainFromNetwork,
  fundsMayHaveMoved,
  isTestnetCliChain,
  parseAcceptedChainsHint,
  pickPayChain,
  type FundedChain,
} from "@/lib/circle-chains";
import { parseBalanceUsdc, parseMaybeJson, runCircle } from "@/lib/circle-cli";
import {
  isAllowedCliChain,
  isSafeHttpUrl,
  isSafeJsonPayload,
  normalizeMethod,
} from "@/lib/circle-safety";
import { fetchRaw402Accepts, mergeAccepts } from "@/lib/circle-x402";
import { mockPay, sleep } from "@/lib/mock-data";
import { getNetwork } from "@/lib/networks";
import { isSharedHost, sharedHostLiveError } from "@/lib/hosted";
import { isAddress, readJsonBody, readNetwork, wantsDemo } from "@/lib/request";
import type { PaymentAcceptance } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Official buyer path (setup.md + wallet-pay.md):
 *   inspect + raw 402 accepts[] → both balance pools → estimate → pay -X
 * Never assume BASE. Circle Agent Wallet CLI only.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const demo = wantsDemo({ body });
  const network = getNetwork(readNetwork({ body }));
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const maxAmount =
    typeof body.maxAmount === "number"
      ? body.maxAmount
      : Number(body.maxAmount ?? 0.01);
  const methodHint =
    typeof body.method === "string" ? body.method.toUpperCase() : undefined;
  const data = typeof body.data === "string" ? body.data : undefined;
  const estimateOnly = body.estimate === true;

  if (!isSafeHttpUrl(url)) {
    return Response.json({ error: "A valid http(s) service URL is required." }, { status: 400 });
  }
  if (!Number.isFinite(maxAmount) || maxAmount <= 0) {
    return Response.json({ error: "maxAmount must be a positive USDC amount." }, { status: 400 });
  }
  if (data && !isSafeJsonPayload(data)) {
    return Response.json(
      { error: "Request body must be valid JSON without shell metacharacters." },
      { status: 400 },
    );
  }

  if (!demo && isSharedHost()) {
    return Response.json(sharedHostLiveError(), { status: 403 });
  }

  if (demo) {
    await sleep(estimateOnly ? 280 : 1100);
    if (estimateOnly) {
      return Response.json({
        ok: true,
        demo: true,
        url,
        chain: network.cliChain,
        address: isAddress(address) ? address : "0xA93d4E8c1B7f2a90C6eD4b8F0A12E9d5C3f2C1a4",
        amountUsdc: maxAmount,
        status: 200,
        paid: false,
        estimated: true,
        method: normalizeMethod(methodHint),
        response: { estimate: true, maxAmount },
      });
    }
    return Response.json(
      mockPay({
        url,
        address: isAddress(address)
          ? address
          : "0xA93d4E8c1B7f2a90C6eD4b8F0A12E9d5C3f2C1a4",
        chain: network.cliChain,
        maxAmount,
      }),
    );
  }

  if (!isAddress(address)) {
    return Response.json(
      { error: "Connect an agent wallet before paying." },
      { status: 400 },
    );
  }

  const inspected = await runCircle(["services", "inspect", url, "--output", "json"], {
    timeoutMs: 20_000,
  });

  if (inspected.missing) {
    return Response.json(
      {
        ok: false,
        demo: false,
        url,
        chain: network.cliChain,
        address,
        amountUsdc: maxAmount,
        status: 503,
        paid: false,
        response: null,
        error: "Circle CLI is not installed — live nanopayments cannot be signed.",
        hint: "Install `@circle-fin/cli`, authenticate, fund the wallet (and Gateway if needed). Or enable Demo Mode.",
      },
      { status: 503 },
    );
  }

  const inspectData = unwrapRecord(inspected.parsed);
  const inspectAccepts = Array.isArray(inspectData?.accepts)
    ? (inspectData?.accepts as PaymentAcceptance[])
    : [];
  const raw402 = await fetchRaw402Accepts(url);
  const accepts = mergeAccepts(inspectAccepts, raw402);
  const method = normalizeMethod(
    (typeof inspectData?.method === "string" && inspectData.method) || methodHint,
  );
  const advertised = advertisedUsdc(inspectData, accepts);
  const funded = await readFundedPools(address, accepts, network.cliChain);
  const picked = pickPayChain(
    accepts,
    network.cliChain,
    funded,
    advertised ?? maxAmount,
    network.environment,
  );
  if (!picked && network.environment === "testnet") {
    return Response.json(
      {
        ok: false,
        demo: false,
        url,
        chain: network.cliChain,
        address,
        amountUsdc: advertised ?? maxAmount,
        status: 409,
        paid: false,
        method,
        response: null,
        error: "This service does not accept Arc Testnet.",
        hint: "It wants a mainnet chain (often Ethereum Gateway). Stay on Demo, or pick a listing that accepts ARC-TESTNET.",
      },
      { status: 409 },
    );
  }
  let chain = picked?.chain ?? network.cliChain;
  if (network.environment === "testnet" && !isTestnetCliChain(chain)) {
    return Response.json(
      {
        ok: false,
        demo: false,
        url,
        chain,
        address,
        amountUsdc: advertised ?? maxAmount,
        status: 409,
        paid: false,
        method,
        response: null,
        error: `Refusing to pay on ${chain} while you are on Arc Testnet.`,
        hint: "A testnet login cannot sign mainnet x402. Choose an Arc Testnet service or Demo Mode.",
      },
      { status: 409 },
    );
  }
  if (!isAllowedCliChain(chain)) {
    return Response.json(
      {
        error: `Refusing unknown --chain ${chain}.`,
        hint: "Chain must come from inspect/402 accepts[].",
      },
      { status: 400 },
    );
  }

  if (advertised != null && maxAmount + 1e-9 < advertised) {
    return Response.json(
      {
        error: `Cap ${maxAmount} USDC is below the advertised ${advertised} USDC.`,
        hint: "Raise max-amount or pick a cheaper alternative.",
      },
      { status: 400 },
    );
  }
  const payCap = advertised ?? maxAmount;

  const baseArgs = [
    "services",
    "pay",
    url,
    "-X",
    method,
    "--address",
    address,
    "--chain",
    chain,
    "--max-amount",
    String(payCap),
    "--output",
    "json",
    "--timeout",
    "60",
  ];
  if (data) baseArgs.push("--data", data);

  const estimate = await runCircle([...baseArgs, "--estimate"], { timeoutMs: 25_000 });
  if (!estimate.ok) {
    const hintChain = parseAcceptedChainsHint(`${estimate.stderr}\n${estimate.stdout}`);
    if (
      hintChain &&
      hintChain !== chain &&
      !(network.environment === "testnet" && !isTestnetCliChain(hintChain))
    ) {
      chain = hintChain;
      const retried = await runCircle(
        swapChain(baseArgs, chain).concat("--estimate"),
        { timeoutMs: 25_000 },
      );
      if (!retried.ok && !estimateOnly) {
        const classified = classifyPayFailure(`${retried.stderr}\n${retried.stdout}`);
        return Response.json(
          {
            ok: false,
            demo: false,
            url,
            chain,
            address,
            amountUsdc: payCap,
            status: retried.code ?? 502,
            paid: false,
            estimated: true,
            method,
            response: retried.parsed ?? retried.stdout,
            error: retried.stderr || retried.stdout || "Estimate failed.",
            hint: classified.hint,
          },
          { status: 502 },
        );
      }
    } else {
      const classified = classifyPayFailure(`${estimate.stderr}\n${estimate.stdout}`);
      return Response.json(
        {
          ok: false,
          demo: false,
          url,
          chain,
          address,
          amountUsdc: payCap,
          status: estimate.code ?? 502,
          paid: false,
          estimated: true,
          method,
          response: estimate.parsed ?? estimate.stdout,
          error: estimate.stderr || estimate.stdout || "Estimate failed.",
          hint: classified.hint,
        },
        { status: 502 },
      );
    }
  }

  if (estimateOnly) {
    return Response.json({
      ok: true,
      demo: false,
      url,
      chain,
      address,
      amountUsdc: payCap,
      status: 200,
      paid: false,
      estimated: true,
      method,
      response: estimate.parsed ?? estimate.stdout,
    });
  }

  const payArgs = swapChain(baseArgs, chain);
  const result = await runCircle(payArgs, { timeoutMs: 55_000 });
  const combined = `${result.stderr}\n${result.stdout}`;

  if (!result.ok) {
    if (/Wallet not deployed/i.test(combined)) {
      await runCircle(
        [
          "wallet",
          "transfer",
          address,
          "--amount",
          "0",
          "--address",
          address,
          "--chain",
          chain,
          "--token",
          "usdc",
          "--output",
          "json",
        ],
        { timeoutMs: 45_000 },
      );
      const afterDeploy = await runCircle(payArgs, { timeoutMs: 55_000 });
      if (afterDeploy.ok) {
        return Response.json({
          ok: true,
          demo: false,
          url,
          chain,
          address,
          amountUsdc: payCap,
          status: 200,
          paid: true,
          method,
          response:
            afterDeploy.parsed ?? parseMaybeJson(afterDeploy.stdout) ?? afterDeploy.stdout,
        });
      }
    }

    const moved = fundsMayHaveMoved(combined);
    const classified = classifyPayFailure(combined);
    const hintChain = parseAcceptedChainsHint(combined);
    if (
      classified.retryable &&
      hintChain &&
      hintChain !== chain &&
      !moved &&
      !(network.environment === "testnet" && !isTestnetCliChain(hintChain))
    ) {
      const retry = await runCircle(swapChain(payArgs, hintChain), { timeoutMs: 55_000 });
      if (retry.ok) {
        return Response.json({
          ok: true,
          demo: false,
          url,
          chain: hintChain,
          address,
          amountUsdc: payCap,
          status: 200,
          paid: true,
          method,
          response: retry.parsed ?? parseMaybeJson(retry.stdout) ?? retry.stdout,
        });
      }
      const retryText = `${retry.stderr}\n${retry.stdout}`;
      const retryClass = classifyPayFailure(retryText);
      return Response.json(
        {
          ok: false,
          demo: false,
          url,
          chain: hintChain,
          address,
          amountUsdc: payCap,
          status: retry.code ?? 502,
          paid: false,
          method,
          fundsMayHaveMoved: fundsMayHaveMoved(retryText),
          response: retry.parsed ?? retry.stdout,
          error: retry.stderr || retry.stdout || "Payment failed.",
          hint: retryClass.hint,
        },
        { status: 502 },
      );
    }

    return Response.json(
      {
        ok: false,
        demo: false,
        url,
        chain,
        address,
        amountUsdc: payCap,
        status: result.code ?? 502,
        paid: false,
        method,
        fundsMayHaveMoved: moved,
        response: result.parsed ?? result.stdout,
        error: result.stderr || result.stdout || "Payment failed.",
        hint: classified.hint,
      },
      { status: 502 },
    );
  }

  return Response.json({
    ok: true,
    demo: false,
    url,
    chain,
    address,
    amountUsdc: payCap,
    status: 200,
    paid: true,
    method,
    response: result.parsed ?? parseMaybeJson(result.stdout) ?? result.stdout,
  });
}

function unwrapRecord(parsed: unknown): Record<string, unknown> | null {
  if (!parsed || typeof parsed !== "object") return null;
  const rec = parsed as Record<string, unknown>;
  if (rec.data && typeof rec.data === "object") return rec.data as Record<string, unknown>;
  return rec;
}

function advertisedUsdc(
  inspectData: Record<string, unknown> | null,
  accepts: PaymentAcceptance[],
): number | null {
  if (inspectData) {
    for (const key of ["priceUsdc", "amountUsdc", "price"]) {
      const v = inspectData[key];
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && Number.isFinite(Number(v))) return Number(v);
    }
  }
  const first = accepts[0];
  if (!first) return null;
  const atomic = first.amount ?? first.maxAmountRequired;
  if (!atomic || !Number.isFinite(Number(atomic))) return null;
  return Number(atomic) / 1_000_000;
}

function swapChain(args: string[], chain: string): string[] {
  const next = [...args];
  const idx = next.indexOf("--chain");
  if (idx >= 0 && idx + 1 < next.length) next[idx + 1] = chain;
  return next;
}

async function readFundedPools(
  address: string,
  accepts: PaymentAcceptance[],
  preferred: string,
): Promise<FundedChain[]> {
  const chains = new Set<string>([preferred]);
  for (const item of accepts) {
    const chain = cliChainFromNetwork(item.network);
    if (chain) chains.add(chain);
  }

  const rows: FundedChain[] = [];
  for (const chain of chains) {
    const [vanilla, gateway] = await Promise.all([
      runCircle(
        ["wallet", "balance", "--address", address, "--chain", chain, "--output", "json"],
        { timeoutMs: 12_000 },
      ),
      runCircle(
        ["gateway", "balance", "--address", address, "--chain", chain, "--output", "json"],
        { timeoutMs: 12_000 },
      ),
    ]);
    rows.push({
      chain,
      vanilla: parseBalanceUsdc(vanilla.parsed, vanilla.stdout) ?? 0,
      gateway: parseBalanceUsdc(gateway.parsed, gateway.stdout) ?? 0,
    });
  }
  return rows;
}
