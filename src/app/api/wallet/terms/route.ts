import { acceptTerms, getTerms } from "@/lib/circle-cli";
import { isSharedHost, sharedHostLiveError } from "@/lib/hosted";
import { readJsonBody } from "@/lib/request";

export const runtime = "nodejs";

export async function GET() {
  const terms = await getTerms();
  if (!terms) {
    return Response.json(
      { error: "Circle CLI is not installed.", demoSuggested: true },
      { status: 503 },
    );
  }
  return Response.json(terms);
}

/**
 * Records Terms acceptance only after the user explicitly consents in the UI.
 * We never set CIRCLE_ACCEPT_TERMS=1 automatically.
 */
export async function POST(request: Request) {
  if (isSharedHost()) {
    return Response.json(sharedHostLiveError(), { status: 403 });
  }
  const body = await readJsonBody(request);
  if (body.accept !== true) {
    return Response.json(
      { error: "Explicit accept: true is required." },
      { status: 400 },
    );
  }

  const result = await acceptTerms();
  if (result.missing) {
    return Response.json(
      { error: "Circle CLI is not installed.", demoSuggested: true },
      { status: 503 },
    );
  }
  if (!result.ok) {
    return Response.json(
      { error: result.stderr || result.stdout || "Failed to record acceptance." },
      { status: 502 },
    );
  }

  const terms = await getTerms();
  return Response.json({ ok: true, terms });
}
