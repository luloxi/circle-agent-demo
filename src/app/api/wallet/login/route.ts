import { parseRequestId, runCircle } from "@/lib/circle-cli";
import { getNetwork } from "@/lib/networks";
import { isEmail, readJsonBody, readNetwork } from "@/lib/request";

export const runtime = "nodejs";

/**
 * Two-step Circle CLI login for non-interactive / UI use:
 *   1. { step: "init", email }     → sends OTP, returns requestId
 *   2. { step: "complete", requestId, otp }
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const step = body.step === "complete" ? "complete" : "init";
  const network = getNetwork(readNetwork({ body }));
  const testnetFlag = network.environment === "testnet" ? ["--testnet"] : [];

  if (step === "init") {
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!isEmail(email)) {
      return Response.json({ error: "A valid email is required." }, { status: 400 });
    }

    const result = await runCircle(
      [
        "wallet",
        "login",
        email,
        "--type",
        "agent",
        "--init",
        "--output",
        "json",
        ...testnetFlag,
      ],
      { timeoutMs: 20_000 },
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
        {
          error: result.stderr || result.stdout || "Failed to start login.",
        },
        { status: 502 },
      );
    }

    const requestId = parseRequestId(result.parsed, result.stdout);
    return Response.json({
      ok: true,
      email,
      requestId,
      message: requestId
        ? `OTP sent to ${email}. Complete login with the code and request id.`
        : `OTP sent to ${email}. If no request id was parsed, check the CLI output.`,
    });
  }

  const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
  const otp = typeof body.otp === "string" ? body.otp.trim() : "";
  if (!requestId || !otp) {
    return Response.json(
      { error: "Both requestId and otp are required to complete login." },
      { status: 400 },
    );
  }
  const otpClean = otp.replace(/\s/g, "");
  if (!/^([A-Za-z0-9]{3}-)?[0-9]{6}$/.test(otpClean) && !/^[A-Za-z0-9-]{4,32}$/.test(otpClean)) {
    return Response.json({ error: "OTP format looks invalid. Use ABC-123456 or 123456." }, { status: 400 });
  }

  const result = await runCircle(
    [
      "wallet",
      "login",
      "--type",
      "agent",
      "--request",
      requestId,
      "--otp",
      otp,
      "--output",
      "json",
      ...testnetFlag,
    ],
    { timeoutMs: 20_000 },
  );

  if (!result.ok) {
    return Response.json(
      {
        error: result.stderr || result.stdout || "OTP verification failed.",
        hint: "Request ids expire after 10 minutes. Start login again for a fresh code.",
      },
      { status: 401 },
    );
  }

  return Response.json({
    ok: true,
    message: "Logged in. You can now connect / create the agent wallet.",
  });
}
