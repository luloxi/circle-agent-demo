"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/client-api";
import { getNetwork } from "@/lib/networks";
import type { NetworkId, TermsInfo, WalletStatusPayload } from "@/lib/types";

type Step = "probe" | "cli" | "terms" | "email" | "otp";

export function ConnectDialog({
  open,
  onOpenChange,
  network,
  onConnected,
  onLog,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  network: NetworkId;
  onConnected: (payload: WalletStatusPayload) => void;
  onLog: (level: "info" | "ok" | "warn" | "error", action: string, message: string) => void;
}) {
  const [step, setStep] = useState<Step>("probe");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terms, setTerms] = useState<TermsInfo | null>(null);
  const [acceptedBox, setAcceptedBox] = useState(false);
  const [email, setEmail] = useState("");
  const [requestId, setRequestId] = useState("");
  const [otp, setOtp] = useState("");
  const net = getNetwork(network);

  function reset() {
    setStep("probe");
    setBusy(false);
    setError(null);
    setTerms(null);
    setAcceptedBox(false);
    setEmail("");
    setRequestId("");
    setOtp("");
  }

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    void probe();
    // Probe on open (Radix does not fire onOpenChange when the parent sets open).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, network]);

  async function probe() {
    setBusy(true);
    setError(null);
    try {
      const status = await api.walletStatus(false, network);
      if (status.needsTerms) {
        setTerms(status.terms);
        setStep("terms");
        onLog("warn", "TERMS", "Circle CLI Terms must be accepted on this machine.");
        return;
      }
      if (status.needsAuth) {
        if (!status.cli.installed) {
          setError(status.hint ?? "Circle CLI is not installed.");
          setStep("cli");
          return;
        }
        setStep("email");
        onLog("info", "AUTH", "CLI is installed. Email + OTP required.");
        return;
      }
      if (status.wallet) {
        onLog("ok", "AUTH", `Already authenticated${status.email ? ` as ${status.email}` : ""}.`);
        onConnected(status);
        onOpenChange(false);
        reset();
        return;
      }
      const connected = await api.connect(false, network);
      onConnected(connected);
      onOpenChange(false);
      reset();
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.body.needsTerms) {
        setTerms(apiErr.body.terms ?? null);
        setStep("terms");
        return;
      }
      if (apiErr?.body.needsAuth) {
        setStep(apiErr.body.cliInstalled === false ? "cli" : "email");
        setError(apiErr.message);
        return;
      }
      setError(err instanceof Error ? err.message : "Could not reach wallet status.");
      setStep("cli");
    } finally {
      setBusy(false);
    }
  }

  async function acceptTerms() {
    if (!acceptedBox) {
      setError("Check the box after you have reviewed the Terms.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api.acceptTerms();
      onLog("ok", "TERMS", "Terms acceptance recorded locally.");
      if (result.terms?.accepted) {
        setStep("email");
        onLog("info", "AUTH", "Email + OTP required.");
        setBusy(false);
        return;
      }
      await probe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record acceptance.");
      setBusy(false);
    }
  }

  async function sendOtp() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.loginInit(email, network);
      setRequestId(result.requestId ?? "");
      setStep("otp");
      onLog("info", "AUTH", `OTP sent to ${email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function completeLogin() {
    if (!requestId) {
      setError("Missing request id. Send a new OTP.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.loginComplete(requestId, otp, network);
      onLog("ok", "AUTH", "OTP accepted. Connecting wallet…");
      const connected = await api.connect(false, network);
      onConnected(connected);
      onOpenChange(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Agent Wallet</DialogTitle>
          <DialogDescription>
            Live mode talks to a real Circle Agent Wallet on {net.label}. You
            sign in with email + OTP. Demo Mode uses a mock wallet instead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === "probe" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Checking Circle CLI and session…
            </div>
          ) : null}

          {step === "cli" ? (
            <div className="space-y-3 text-sm">
              <p>
                The Circle CLI is not available yet. Install it, then check
                again — this dialog will ask for your email next.
              </p>
              <pre className="overflow-auto rounded-lg bg-black/40 p-3 font-mono text-[11px] leading-6">
                {`npm install @circle-fin/cli
npx circle --version`}
              </pre>
            </div>
          ) : null}

          {step === "terms" ? (
            <div className="space-y-3 text-sm">
              <p>Review Circle&apos;s Terms before any wallet command can run.</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  <a
                    className="underline"
                    href={terms?.termsOfUseUrl ?? "https://agents.circle.com/terms-of-use"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Terms of Use
                  </a>
                </li>
                <li>
                  <a
                    className="underline"
                    href={
                      terms?.privacyPolicyUrl ??
                      "https://www.circle.com/legal/privacy-policy"
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Privacy Policy
                  </a>
                </li>
              </ul>
              {terms?.termsNotice ? (
                <p className="text-xs text-muted-foreground">{terms.termsNotice}</p>
              ) : null}
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={acceptedBox}
                  onChange={(e) => setAcceptedBox(e.target.checked)}
                />
                I have reviewed the Terms and Privacy Policy and I accept them.
              </label>
            </div>
          ) : null}

          {step === "email" ? (
            <div className="space-y-2">
              <Label htmlFor="agent-email">Email for OTP</Label>
              <Input
                id="agent-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
          ) : null}

          {step === "otp" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="otp">OTP code</Label>
                <Input
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="ABC-123456"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-id">Request id</Label>
                <Input
                  id="request-id"
                  value={requestId}
                  onChange={(e) => setRequestId(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not continue</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === "probe" || step === "cli" ? (
            <Button onClick={() => void probe()} disabled={busy}>
              {busy ? <Loader2Icon className="animate-spin" /> : null}
              {step === "probe" ? "Checking" : "Check again"}
            </Button>
          ) : null}
          {step === "terms" ? (
            <Button onClick={acceptTerms} disabled={busy}>
              {busy ? <Loader2Icon className="animate-spin" /> : null}
              Accept Terms
            </Button>
          ) : null}
          {step === "email" ? (
            <Button onClick={sendOtp} disabled={busy || !email}>
              {busy ? <Loader2Icon className="animate-spin" /> : null}
              Send OTP
            </Button>
          ) : null}
          {step === "otp" ? (
            <Button onClick={completeLogin} disabled={busy || !otp}>
              {busy ? <Loader2Icon className="animate-spin" /> : null}
              Verify & connect
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
