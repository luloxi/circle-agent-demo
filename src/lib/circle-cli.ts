/**
 * Thin wrapper around the Circle CLI (`@circle-fin/cli`, command `circle`).
 *
 * Live wallet / pay operations require the CLI to be installed and
 * authenticated on this machine. Discovery search does NOT — it uses the
 * public HTTP API in `discovery.ts`.
 *
 * We always spawn with an argument array (never a shell string) so user
 * input cannot be interpolated into a shell.
 */

import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CliStatus, TermsInfo, WalletInfo } from "@/lib/types";

export interface CircleRunResult {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
  parsed: unknown;
  /** True when the binary could not be found. */
  missing: boolean;
}

const DEFAULT_TIMEOUT_MS = 25_000;

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

let cachedBin: string | null | undefined;

export function resetCircleBinCache() {
  cachedBin = undefined;
}

export async function resolveCircleBin(): Promise<string | null> {
  if (cachedBin) return cachedBin;

  const candidates = [
    process.env.CIRCLE_CLI_PATH,
    join(process.cwd(), "node_modules", ".bin", "circle"),
    join(homedir(), ".npm-global", "bin", "circle"),
    join(homedir(), ".local", "bin", "circle"),
    "/usr/local/bin/circle",
    "/usr/bin/circle",
  ].filter((v): v is string => Boolean(v));

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      cachedBin = candidate;
      return cachedBin;
    }
  }

  // PATH fallback — do not cache, so a later local install is found.
  return "circle";
}

export async function runCircle(
  args: string[],
  opts: { timeoutMs?: number; env?: NodeJS.ProcessEnv } = {},
): Promise<CircleRunResult> {
  const bin = await resolveCircleBin();
  if (!bin) {
    return {
      ok: false,
      code: null,
      stdout: "",
      stderr: "Circle CLI not found",
      parsed: null,
      missing: true,
    };
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise((resolve) => {
    const child = spawn(/* turbopackIgnore: true */ bin, args, {
      env: {
        ...process.env,
        // Never auto-accept Terms from this app.
        CIRCLE_ACCEPT_TERMS: process.env.CIRCLE_ACCEPT_TERMS ?? "0",
        // x402 payment headers can overflow Node's default 16kb limit.
        NODE_OPTIONS: [process.env.NODE_OPTIONS, "--max-http-header-size=262144"]
          .filter(Boolean)
          .join(" "),
        ...opts.env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (result: CircleRunResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish({
        ok: false,
        code: null,
        stdout,
        stderr: stderr || `Timed out after ${timeoutMs}ms`,
        parsed: parseMaybeJson(stdout),
        missing: false,
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      const missing =
        "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT";
      finish({
        ok: false,
        code: null,
        stdout,
        stderr: err.message,
        parsed: null,
        missing,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      finish({
        ok: code === 0,
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        parsed: parseMaybeJson(stdout),
        missing: false,
      });
    });
  });
}

export function parseMaybeJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const start = trimmed.search(/[{[]/);
  if (start === -1) return null;

  const candidate = trimmed.slice(start);
  try {
    return JSON.parse(candidate);
  } catch {
    // Some CLI commands print a banner then JSON. Try last {...} block.
    const lastBrace = trimmed.lastIndexOf("{");
    if (lastBrace > start) {
      try {
        return JSON.parse(trimmed.slice(lastBrace));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function unwrapData(parsed: unknown): unknown {
  if (parsed && typeof parsed === "object" && "data" in parsed) {
    return (parsed as { data: unknown }).data;
  }
  return parsed;
}

export async function getCliStatus(): Promise<CliStatus> {
  const path = await resolveCircleBin();
  const result = await runCircle(["--version"], { timeoutMs: 8_000 });
  if (result.missing) {
    return { installed: false, version: null, path: null };
  }
  if (!result.ok && !result.stdout) {
    return { installed: false, version: null, path: null };
  }
  const version =
    result.stdout.split("\n").find((line) => line.trim())?.trim() ??
    result.stdout.trim() ??
    null;
  return { installed: true, version, path };
}

export function detectTermsRequired(result: CircleRunResult): boolean {
  const blob = `${result.stdout}\n${result.stderr}`.toLowerCase();
  return blob.includes("terms acceptance is required") || blob.includes("circle cli terms");
}

export function detectNotLoggedIn(result: CircleRunResult): boolean {
  const blob = `${result.stdout}\n${result.stderr}`.toLowerCase();
  return blob.includes("not logged in") || blob.includes("wallet login");
}

function parseTermsPayload(parsed: unknown): TermsInfo {
  const data = (unwrapData(parsed) ?? parsed) as Record<string, unknown> | null;
  if (!data || typeof data !== "object") {
    return { accepted: false };
  }
  const acceptance =
    data.acceptance && typeof data.acceptance === "object"
      ? (data.acceptance as Record<string, unknown>)
      : null;
  return {
    accepted: Boolean(data.accepted) || Boolean(acceptance?.accepted),
    currentVersion: typeof data.currentVersion === "string" ? data.currentVersion : undefined,
    termsOfUseUrl:
      typeof data.termsOfUseUrl === "string" ? data.termsOfUseUrl : undefined,
    privacyPolicyUrl:
      typeof data.privacyPolicyUrl === "string" ? data.privacyPolicyUrl : undefined,
    termsNotice: typeof data.termsNotice === "string" ? data.termsNotice : undefined,
  };
}

export async function getTerms(): Promise<TermsInfo | null> {
  // `show --init` is presentation-only and omits `accepted`. Always read status first.
  const status = await runCircle(["terms", "show", "--output", "json"], {
    timeoutMs: 10_000,
  });
  if (status.missing) return null;
  const terms = parseTermsPayload(status.parsed);
  if (terms.accepted || terms.termsNotice) return terms;

  const init = await runCircle(["terms", "show", "--init", "--output", "json"], {
    timeoutMs: 10_000,
  });
  if (init.missing) return terms;
  const extra = parseTermsPayload(init.parsed);
  return {
    ...terms,
    termsOfUseUrl: extra.termsOfUseUrl ?? terms.termsOfUseUrl,
    privacyPolicyUrl: extra.privacyPolicyUrl ?? terms.privacyPolicyUrl,
    termsNotice: extra.termsNotice ?? terms.termsNotice,
  };
}

export async function acceptTerms(): Promise<CircleRunResult> {
  return runCircle(["terms", "accept", "--output", "json"], { timeoutMs: 10_000 });
}

export function parseWallets(parsed: unknown, fallbackChain: string): WalletInfo[] {
  const data = unwrapData(parsed);
  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { wallets?: unknown }).wallets)
      ? (data as { wallets: unknown[] }).wallets
      : [];

  const wallets: WalletInfo[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const address =
      (typeof rec.address === "string" && rec.address) ||
      (typeof rec.walletAddress === "string" && rec.walletAddress) ||
      null;
    if (!address) continue;
    wallets.push({
      address,
      chain:
        typeof rec.chain === "string"
          ? rec.chain
          : typeof rec.blockchain === "string"
            ? rec.blockchain
            : fallbackChain,
      type: typeof rec.type === "string" ? rec.type : "agent",
    });
  }
  return wallets;
}

export function parseBalanceUsdc(parsed: unknown, stdout: string): number | null {
  const data = unwrapData(parsed);

  const fromRecord = (rec: Record<string, unknown>): number | null => {
    for (const key of ["usdc", "USDC", "balance", "amount"]) {
      const v = rec[key];
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) {
        return Number(v);
      }
    }
    return null;
  };

  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    const direct = fromRecord(rec);
    if (direct != null) return direct;

    const balances = rec.tokenBalances ?? rec.balances ?? rec.tokens;
    if (Array.isArray(balances)) {
      for (const item of balances) {
        if (!item || typeof item !== "object") continue;
        const row = item as Record<string, unknown>;
        const symbol = String(row.token ?? row.symbol ?? row.ticker ?? "").toUpperCase();
        if (symbol && symbol !== "USDC") continue;
        const n = fromRecord(row);
        if (n != null) return n;
      }
    }
  }

  const match = stdout.match(/([\d.]+)\s*USDC/i);
  if (match) return Number(match[1]);
  return null;
}

export function parseEmail(parsed: unknown, stdout: string): string | null {
  const data = unwrapData(parsed);
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    if (typeof rec.email === "string") return rec.email;
    if (rec.user && typeof rec.user === "object" && rec.user && "email" in rec.user) {
      const email = (rec.user as { email?: unknown }).email;
      if (typeof email === "string") return email;
    }
  }
  const match = stdout.match(/logged in as\s+(\S+@\S+)/i) ?? stdout.match(/(\S+@\S+)/);
  return match?.[1] ?? null;
}

export function parseRequestId(parsed: unknown, stdout: string): string | null {
  const data = unwrapData(parsed);
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    for (const key of ["requestId", "request_id", "id"]) {
      if (typeof rec[key] === "string") return rec[key] as string;
    }
  }
  const match =
    stdout.match(/--request\s+([0-9a-f-]{8,})/i) ??
    stdout.match(/request(?: id)?:\s*([0-9a-f-]{8,})/i);
  return match?.[1] ?? null;
}

export function cliMissingHint(): string {
  return "Install the Circle CLI with `npm install -g @circle-fin/cli`, then run `circle wallet login you@email.com --init --testnet` on this machine. Or flip Demo Mode on to walk the full flow with mocked responses.";
}
