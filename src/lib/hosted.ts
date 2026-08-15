/**
 * The public Vercel deploy has no per-visitor Circle CLI session.
 * Live sign/pay on that host would spend whoever last logged in on
 * the server — so hosted live mutations are refused. Demo + Discovery stay open.
 */
export function isSharedHost(): boolean {
  return process.env.VERCEL === "1" || process.env.AQC_SHARED_HOST === "1";
}

export const AGENT_SKILL_PATH = "/agent.md";

export function sharedHostLiveError() {
  return {
    error: "Live wallet and pay are disabled on the shared host.",
    hint: "Each agent must sign with its own Circle Agent Wallet (CLI on the user's machine). Fetch /agent.md and follow it. Demo Mode and marketplace search still work here.",
    skill: AGENT_SKILL_PATH,
    demoSuggested: true,
  };
}
