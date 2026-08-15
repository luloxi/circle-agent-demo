import {
  detectNotLoggedIn,
  detectTermsRequired,
  getCliStatus,
  getTerms,
  parseBalanceUsdc,
  parseEmail,
  parseWallets,
  runCircle,
} from "@/lib/circle-cli";
import { gatewayChainsFor, readMaxGatewayUsdc } from "@/lib/circle-gateway";
import { DEMO_STARTING_BALANCE, DEMO_WALLET } from "@/lib/mock-data";
import { getNetwork } from "@/lib/networks";
import { readNetwork, wantsDemo } from "@/lib/request";
import type { WalletStatusPayload } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const demo = wantsDemo({ searchParams });
  const network = getNetwork(readNetwork({ searchParams }));

  if (demo) {
    const payload: WalletStatusPayload = {
      demo: true,
      cli: { installed: false, version: null, path: null },
      terms: { accepted: true },
      authenticated: true,
      email: DEMO_WALLET.email ?? null,
      wallets: [{ ...DEMO_WALLET, chain: network.cliChain }],
      wallet: { ...DEMO_WALLET, chain: network.cliChain },
      balanceUsdc: DEMO_STARTING_BALANCE,
      gatewayBalanceUsdc: 0,
      needsAuth: false,
      needsTerms: false,
      hint: "Demo Mode — mocked agent wallet. Flip the toggle off to use the Circle CLI on this machine.",
    };
    return Response.json(payload);
  }

  const cli = await getCliStatus();
  if (!cli.installed) {
    const payload: WalletStatusPayload = {
      demo: false,
      cli,
      terms: null,
      authenticated: false,
      email: null,
      wallets: [],
      wallet: null,
      balanceUsdc: null,
      needsAuth: true,
      needsTerms: false,
      hint: "Circle CLI is not installed. Enable Demo Mode, or run `npm install -g @circle-fin/cli` and authenticate.",
    };
    return Response.json(payload);
  }

  const terms = await getTerms();
  if (terms && !terms.accepted) {
    const payload: WalletStatusPayload = {
      demo: false,
      cli,
      terms,
      authenticated: false,
      email: null,
      wallets: [],
      wallet: null,
      balanceUsdc: null,
      needsAuth: false,
      needsTerms: true,
      hint: "Accept the Circle CLI Terms of Use before wallet commands can run.",
    };
    return Response.json(payload);
  }

  const testnetFlag = network.environment === "testnet" ? ["--testnet"] : [];
  const status = await runCircle(
    ["wallet", "status", "--type", "agent", "--output", "json", ...testnetFlag],
    { timeoutMs: 12_000 },
  );

  if (detectTermsRequired(status)) {
    const payload: WalletStatusPayload = {
      demo: false,
      cli,
      terms: terms ?? { accepted: false },
      authenticated: false,
      email: null,
      wallets: [],
      wallet: null,
      balanceUsdc: null,
      needsAuth: false,
      needsTerms: true,
      hint: "Circle CLI Terms acceptance is required on this machine.",
    };
    return Response.json(payload);
  }

  if (!status.ok || detectNotLoggedIn(status)) {
    const payload: WalletStatusPayload = {
      demo: false,
      cli,
      terms,
      authenticated: false,
      email: null,
      wallets: [],
      wallet: null,
      balanceUsdc: null,
      needsAuth: true,
      needsTerms: false,
      hint: `Not logged in. Use email + OTP: circle wallet login <email> --init${network.environment === "testnet" ? " --testnet" : ""}.`,
    };
    return Response.json(payload);
  }

  const email = parseEmail(status.parsed, status.stdout);
  const listed = await runCircle(
    [
      "wallet",
      "list",
      "--chain",
      network.cliChain,
      "--type",
      "agent",
      "--output",
      "json",
    ],
    { timeoutMs: 15_000 },
  );
  const wallets = parseWallets(listed.parsed, network.cliChain);
  const wallet = wallets[0] ?? null;

  let balanceUsdc: number | null = null;
  if (wallet) {
    const bal = await runCircle(
      [
        "wallet",
        "balance",
        "--address",
        wallet.address,
        "--chain",
        network.cliChain,
        "--output",
        "json",
      ],
      { timeoutMs: 15_000 },
    );
    balanceUsdc = parseBalanceUsdc(bal.parsed, bal.stdout);
  }

  const gatewayBalanceUsdc = wallet
    ? await readMaxGatewayUsdc(wallet.address, gatewayChainsFor(network.cliChain))
    : null;

  const payload: WalletStatusPayload = {
    demo: false,
    cli,
    terms,
    authenticated: true,
    email,
    wallets,
    wallet,
    balanceUsdc,
    gatewayBalanceUsdc,
    needsAuth: false,
    needsTerms: false,
    hint: wallet
      ? gatewayBalanceUsdc === 0 || gatewayBalanceUsdc == null
        ? "On-chain USDC is the vanilla pool. Gateway nanopayments need `circle gateway deposit` (eco → Polygon / MATIC)."
        : null
      : "Authenticated, but no agent wallet on this chain yet. Create one next.",
  };
  return Response.json(payload);
}
