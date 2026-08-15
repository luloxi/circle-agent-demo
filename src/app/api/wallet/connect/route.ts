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
import { DEMO_STARTING_BALANCE, DEMO_WALLET, sleep } from "@/lib/mock-data";
import { getNetwork } from "@/lib/networks";
import { isSharedHost, sharedHostLiveError } from "@/lib/hosted";
import { readJsonBody, readNetwork, wantsDemo } from "@/lib/request";
import type { WalletStatusPayload } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Connect or create an agent wallet.
 * Demo Mode returns a fixture. Live mode talks to the Circle CLI.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const demo = wantsDemo({ body });
  const network = getNetwork(readNetwork({ body }));

  if (!demo && isSharedHost()) {
    return Response.json(sharedHostLiveError(), { status: 403 });
  }

  if (demo) {
    await sleep(700);
    const payload: WalletStatusPayload = {
      demo: true,
      cli: { installed: false, version: null, path: null },
      terms: { accepted: true },
      authenticated: true,
      email: DEMO_WALLET.email ?? null,
      wallets: [{ ...DEMO_WALLET, chain: network.cliChain }],
      wallet: { ...DEMO_WALLET, chain: network.cliChain },
      balanceUsdc: DEMO_STARTING_BALANCE,
      needsAuth: false,
      needsTerms: false,
      hint: "Demo wallet connected. Fund, search, and pay will succeed with mocked USDC.",
    };
    return Response.json(payload);
  }

  const cli = await getCliStatus();
  if (!cli.installed) {
    return Response.json(
      {
        error: "Circle CLI is not installed on this machine.",
        hint: "Run `npm install -g @circle-fin/cli`, accept Terms, then `circle wallet login you@email.com --init --testnet`. Or enable Demo Mode.",
        demoSuggested: true,
        cliInstalled: false,
        needsAuth: true,
      },
      { status: 503 },
    );
  }

  const terms = await getTerms();
  if (terms && !terms.accepted) {
    return Response.json(
      {
        error: "Circle CLI Terms of Use must be accepted first.",
        hint: "Review the Terms in the connect dialog, then accept them here. This app never accepts Terms on your behalf.",
        needsTerms: true,
        terms,
        cliInstalled: true,
      },
      { status: 403 },
    );
  }

  const testnetFlag = network.environment === "testnet" ? ["--testnet"] : [];
  const status = await runCircle(
    ["wallet", "status", "--type", "agent", "--output", "json", ...testnetFlag],
    { timeoutMs: 12_000 },
  );

  if (detectTermsRequired(status)) {
    return Response.json(
      {
        error: "Circle CLI Terms of Use must be accepted first.",
        needsTerms: true,
        terms: terms ?? { accepted: false },
        cliInstalled: true,
      },
      { status: 403 },
    );
  }

  if (!status.ok || detectNotLoggedIn(status)) {
    return Response.json(
      {
        error: "Not logged in to an agent wallet session.",
        hint: `Send an OTP with circle wallet login <email> --init${network.environment === "testnet" ? " --testnet" : ""}.`,
        needsAuth: true,
        cliInstalled: true,
      },
      { status: 401 },
    );
  }

  const email = parseEmail(status.parsed, status.stdout);
  let listed = await runCircle(
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
  let wallets = parseWallets(listed.parsed, network.cliChain);

  if (wallets.length === 0) {
    const created = await runCircle(
      ["wallet", "create", "--type", "agent", "--output", "json", ...testnetFlag],
      { timeoutMs: 30_000 },
    );
    if (!created.ok) {
      return Response.json(
        {
          error: created.stderr || created.stdout || "Failed to create agent wallet.",
          hint: "Try `circle wallet create --type agent --testnet --output json` in a terminal.",
          cliInstalled: true,
        },
        { status: 502 },
      );
    }
    wallets = parseWallets(created.parsed, network.cliChain);
    if (wallets.length === 0) {
      listed = await runCircle(
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
      wallets = parseWallets(listed.parsed, network.cliChain);
    }
  }

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

  const payload: WalletStatusPayload = {
    demo: false,
    cli,
    terms,
    authenticated: true,
    email,
    wallets,
    wallet,
    balanceUsdc,
    needsAuth: false,
    needsTerms: false,
    hint: wallet
      ? "Agent wallet ready."
      : "Session is authenticated but no wallet address was returned.",
  };
  return Response.json(payload);
}
