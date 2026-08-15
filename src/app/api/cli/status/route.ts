import { getCliStatus } from "@/lib/circle-cli";

export const runtime = "nodejs";

export async function GET() {
  const cli = await getCliStatus();
  return Response.json({
    ...cli,
    hint: cli.installed
      ? "Circle CLI is available for live wallet and pay operations."
      : "Circle CLI is not on PATH. Marketplace search still works via the public Discovery API. Use Demo Mode for wallet + pay, or install `@circle-fin/cli`.",
  });
}
