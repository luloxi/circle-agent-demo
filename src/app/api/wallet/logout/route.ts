import { runCircle } from "@/lib/circle-cli";
import { isSharedHost, sharedHostLiveError } from "@/lib/hosted";

export const runtime = "nodejs";

/** Clears the Agent Wallet CLI session so another email can log in. */
export async function POST() {
  if (isSharedHost()) {
    return Response.json(sharedHostLiveError(), { status: 403 });
  }

  const result = await runCircle(
    ["wallet", "logout", "--type", "agent", "--output", "json"],
    { timeoutMs: 12_000 },
  );

  if (result.missing) {
    return Response.json(
      { error: "Circle CLI is not installed.", demoSuggested: true },
      { status: 503 },
    );
  }

  return Response.json({
    ok: result.ok,
    message: result.ok
      ? "Logged out. Connect again with another email."
      : result.stderr || result.stdout || "Logout failed.",
  });
}
