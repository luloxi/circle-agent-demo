"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SparkleIcon, WalletIcon } from "lucide-react";
import { AssembledResult } from "@/components/assembled-result";
import { ConnectDialog } from "@/components/connect-dialog";
import { CostExplorer } from "@/components/cost-explorer";
import { FlowStepper, type StageId } from "@/components/flow-stepper";
import { FlowTimeline } from "@/components/flow-timeline";
import { FundDialog } from "@/components/fund-dialog";
import { MarketplacePanel } from "@/components/marketplace-panel";
import { PresetGallery } from "@/components/preset-gallery";
import { QueryComposer } from "@/components/query-composer";
import { SiteHeader } from "@/components/site-header";
import { WalletPanel } from "@/components/wallet-panel";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/client-api";
import {
  applyAlternative,
  assemblePlan,
  excerptFromResult,
  removeStep,
} from "@/lib/composer";
import { DEMO_FUND_AMOUNT, DEMO_STARTING_BALANCE } from "@/lib/mock-data";
import { DEFAULT_NETWORK, type AppMode } from "@/lib/networks";
import type {
  ActivityEntry,
  InspectResult,
  LogLevel,
  NetworkId,
  PresetCard,
  QualityTier,
  QueryHistoryItem,
  QueryPlan,
  ServiceListing,
  WalletInfo,
  WalletStatusPayload,
} from "@/lib/types";

const DEFAULT_DEMO =
  process.env.NEXT_PUBLIC_DEFAULT_DEMO_MODE !== "false";

const DEFAULT_SPEND_LIMIT = 0.15;

export function DemoApp({
  initialCatalog,
  initialPresets,
}: {
  initialCatalog: {
    items: ServiceListing[];
    total: number;
    source: string;
    note?: string;
    query: string;
  };
  initialPresets: PresetCard[];
}) {
  const [demoMode, setDemoMode] = useState(DEFAULT_DEMO);
  const [network, setNetwork] = useState<NetworkId>(DEFAULT_NETWORK);

  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [balanceUsdc, setBalanceUsdc] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [funding, setFunding] = useState(false);
  const [funded, setFunded] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [fundMessage, setFundMessage] = useState("");
  const [fundCommands, setFundCommands] = useState<string[]>([]);
  const [fundUrl, setFundUrl] = useState<string | undefined>();

  const [query, setQuery] = useState(initialCatalog.query);
  const [category, setCategory] = useState("");
  const [services, setServices] = useState<ServiceListing[]>(initialCatalog.items);
  const [total, setTotal] = useState(initialCatalog.total);
  const [source, setSource] = useState<string | null>(initialCatalog.source);
  const [note, setNote] = useState<string | undefined>(initialCatalog.note);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ServiceListing | null>(null);
  const [inspect, setInspect] = useState<InspectResult | null>(null);
  const [inspecting, setInspecting] = useState(false);

  const [presets, setPresets] = useState<PresetCard[]>(initialPresets);
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<QueryPlan | null>(null);
  const [decomposing, setDecomposing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [busyPreset, setBusyPreset] = useState<string | null>(null);
  const [spendLimit, setSpendLimit] = useState(DEFAULT_SPEND_LIMIT);
  const [sessionSpent, setSessionSpent] = useState(0);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [view, setView] = useState<StageId>(1);
  const [burstStep, setBurstStep] = useState<number | null>(null);
  const [burstKey, setBurstKey] = useState(0);

  const [logs, setLogs] = useState<ActivityEntry[]>(() => [
    {
      id: "boot",
      ts: Date.now(),
      level: "search",
      action: "BOOT",
      message: `Composer ready · ${initialCatalog.total} catalog services (${initialCatalog.source})`,
    },
  ]);

  const reveal = useCallback((id: StageId) => {
    setView(id);
    setBurstStep(id);
    setBurstKey((k) => k + 1);
  }, []);

  const log = useCallback((level: LogLevel, action: string, message: string) => {
    setLogs((prev) => [
      ...prev.slice(-199),
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ts: Date.now(),
        level,
        action,
        message,
      },
    ]);
  }, []);

  const applyWallet = useCallback((payload: WalletStatusPayload) => {
    setWallet(payload.wallet);
    setEmail(payload.email);
    const bal = payload.balanceUsdc ?? (payload.wallet ? 0 : null);
    setBalanceUsdc(bal);
    setFunded((bal ?? 0) > 0);
    if (payload.wallet) {
      log("ok", "AUTH", `Connected ${payload.wallet.address} on ${payload.wallet.chain}`);
      if (payload.demo || (bal ?? 0) > 0) {
        reveal(2);
      } else {
        setView(1);
        log(
          "warn",
          "FUND",
          network === "BASE"
            ? "Wallet is empty. Add USDC on Base to this address."
            : "Wallet is empty. Get testnet USDC from the Circle faucet.",
        );
      }
    }
    if (bal != null) {
      log("ok", "BAL", `Balance ${bal.toFixed(2)} USDC`);
    }
  }, [log, network, reveal]);

  const resetSession = useCallback(() => {
    setWallet(null);
    setEmail(null);
    setBalanceUsdc(null);
    setFunded(false);
    setSelected(null);
    setInspect(null);
    setPlan(null);
    setSessionSpent(0);
    setView(1);
    setBurstStep(null);
  }, []);

  const search = useCallback(
    async (nextQuery = query, nextCategory = category) => {
      setSearching(true);
      log("search", "SEARCH", nextQuery ? `"${nextQuery}"` : "listing catalog");
      try {
        const result = await api.search({
          demo: demoMode,
          chain: network,
          query: nextQuery,
          category: nextCategory || undefined,
        });
        setServices(result.items);
        setTotal(result.pagination.total);
        setSource(result.source);
        setNote(result.note);
        log(
          "ok",
          "SEARCH",
          `${result.pagination.total} service${result.pagination.total === 1 ? "" : "s"} (${result.source})`,
        );
      } catch (err) {
        log("error", "SEARCH", err instanceof Error ? err.message : "Search failed");
      } finally {
        setSearching(false);
      }
    },
    [category, demoMode, log, network, query],
  );

  useEffect(() => {
    let cancelled = false;
    api.cliStatus().then((cli) => {
      if (cancelled) return;
      log(
        cli.installed ? "ok" : "info",
        "CLI",
        cli.installed
          ? `Circle CLI ${cli.version ?? "detected"}`
          : "Circle CLI not on PATH — Demo Mode or Discovery API only",
      );
    });
    return () => {
      cancelled = true;
    };
  }, [log]);

  async function handleConnect() {
    if (demoMode) {
      setConnecting(true);
      log("info", "AUTH", "Connecting demo agent wallet…");
      try {
        const payload = await api.connect(true, network);
        applyWallet(payload);
        return payload;
      } catch (err) {
        log("error", "AUTH", err instanceof Error ? err.message : "Connect failed");
        return null;
      } finally {
        setConnecting(false);
      }
    }
    setConnectOpen(true);
    return null;
  }

  async function handleDisconnect() {
    log("info", "AUTH", "Disconnecting…");
    if (!demoMode) {
      try {
        const result = await api.logout();
        log(result.ok ? "ok" : "warn", "AUTH", result.message);
      } catch (err) {
        log("warn", "AUTH", err instanceof Error ? err.message : "Logout skipped");
      }
    }
    resetSession();
    setPrompt("");
    setExecuting(false);
    setConnectOpen(false);
    log("ok", "AUTH", "Disconnected. Connect another wallet when ready.");
  }

  async function ensureWallet(): Promise<WalletInfo | null> {
    if (wallet) return wallet;
    if (demoMode) {
      const payload = await handleConnect();
      return payload?.wallet ?? null;
    }
    log("warn", "AUTH", "Connect an agent wallet before executing.");
    setConnectOpen(true);
    return null;
  }

  async function handleFund() {
    if (!wallet?.address && !demoMode) {
      log("warn", "FUND", "Connect a wallet first.");
      return;
    }
    if (!demoMode) {
      setFundOpen(true);
    }
    setFunding(true);
    log("info", "FUND", demoMode ? "Requesting demo faucet…" : "Requesting funds…");
    try {
      const result = await api.fund(demoMode, network, wallet?.address ?? "");
      setFundMessage(result.message);
      setFundCommands(result.commands ?? []);
      setFundUrl(result.faucetUrl);
      if (demoMode) {
        const next = (balanceUsdc ?? DEMO_STARTING_BALANCE) + (result.addedUsdc ?? DEMO_FUND_AMOUNT);
        setBalanceUsdc(next);
        setFunded(true);
        log("ok", "FUND", result.message);
      } else {
        log(result.ok ? "ok" : "warn", "FUND", result.message);
      }
    } catch (err) {
      log("error", "FUND", err instanceof Error ? err.message : "Fund failed");
    } finally {
      setFunding(false);
    }
  }

  const balanceRef = useRef(balanceUsdc);
  balanceRef.current = balanceUsdc;

  const handleRefresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!wallet?.address) return null;
    try {
      const bal = await api.balance(
        demoMode,
        network,
        wallet.address,
        demoMode ? (balanceRef.current ?? undefined) : undefined,
      );
      if (bal.balanceUsdc != null) {
        setBalanceUsdc(bal.balanceUsdc);
        setFunded(bal.balanceUsdc > 0);
        if (!opts?.silent) {
          log("ok", "BAL", `Balance ${bal.balanceUsdc.toFixed(2)} USDC`);
        }
      }
      return bal.balanceUsdc;
    } catch (err) {
      if (!opts?.silent) {
        log("error", "BAL", err instanceof Error ? err.message : "Balance failed");
      }
      return null;
    }
  }, [demoMode, log, network, wallet?.address]);

  const walletAddress = wallet?.address ?? "";
  const liveEmpty = (balanceUsdc ?? 0) <= 0 ? 1 : 0;

  useEffect(() => {
    const watching = !demoMode && Boolean(walletAddress) && (fundOpen || liveEmpty === 1);
    if (!watching) return;

    let cancelled = false;
    const tick = async () => {
      const next = await handleRefresh({ silent: true });
      if (cancelled || next == null) return;
      const prev = balanceRef.current ?? 0;
      if (next > prev) {
        log("ok", "BAL", `Balance ${next.toFixed(2)} USDC`);
        setFunded(true);
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [demoMode, fundOpen, handleRefresh, liveEmpty, log, walletAddress]);

  function handleSelect(service: ServiceListing) {
    setSelected(service);
    log("info", "SELECT", service.resource);
  }

  async function handleInspect() {
    if (!selected) return;
    setInspecting(true);
    log("info", "INSPECT", selected.resource);
    try {
      const result = await api.inspect(demoMode, selected.resource);
      setInspect(result);
      log(
        "ok",
        "INSPECT",
        `${result.method} · ${result.priceUsdc != null ? `${result.priceUsdc} USDC` : "price unknown"} · ${result.source}`,
      );
    } catch (err) {
      log("error", "INSPECT", err instanceof Error ? err.message : "Inspect failed");
    } finally {
      setInspecting(false);
    }
  }

  async function decompose(opts: {
    prompt?: string;
    presetId?: string;
    reveal?: boolean;
  }): Promise<QueryPlan | null> {
    setDecomposing(true);
    log(
      "search",
      "PLAN",
      opts.presetId ? `Decomposing preset ${opts.presetId}` : `Decomposing “${opts.prompt?.slice(0, 80)}”`,
    );
    try {
      const result = await api.decompose({
        demo: demoMode,
        chain: network,
        prompt: opts.prompt,
        presetId: opts.presetId,
      });
      setPlan(result.plan);
      setPresets(result.presets);
      if (opts.prompt) setPrompt(opts.prompt);
      else if (result.plan.prompt) setPrompt(result.plan.prompt);
      log(
        "ok",
        "PLAN",
        `${result.plan.steps.length} steps · est. ${result.plan.estimatedTotal} USDC`,
      );
      if (opts.reveal !== false) reveal(3);
      return result.plan;
    } catch (err) {
      log("error", "PLAN", err instanceof Error ? err.message : "Decompose failed");
      return null;
    } finally {
      setDecomposing(false);
    }
  }

  async function executeCurrent(seed?: QueryPlan) {
    const active = seed ?? plan;
    if (!active || active.steps.length === 0) {
      log("warn", "RUN", "Decompose a query first.");
      return;
    }
    if (active.estimatedTotal > spendLimit) {
      log(
        "warn",
        "RUN",
        `Plan ${active.estimatedTotal} USDC exceeds the ${spendLimit} USDC spend limit.`,
      );
      return;
    }
    if (sessionSpent + active.estimatedTotal > spendLimit) {
      log("warn", "RUN", "This run would push the session over the spend limit.");
      return;
    }

    const connected = await ensureWallet();
    if (!connected?.address) return;

    setExecuting(true);
    reveal(4);
    log("pay", "RUN", `Executing “${active.title}” (${active.steps.length} steps)`);

    let working: QueryPlan = {
      ...active,
      steps: active.steps.map((s) => ({
        ...s,
        status: "pending",
        result: undefined,
        excerpt: undefined,
        error: undefined,
        paidUsdc: undefined,
      })),
      spentTotal: 0,
      assembled: undefined,
    };
    setPlan(working);

    let spent = 0;
    let ok = true;
    const liveBalance = { value: balanceUsdc };

    for (const step of working.steps) {
      working = {
        ...working,
        steps: working.steps.map((s) =>
          s.id === step.id ? { ...s, status: "running" } : s,
        ),
      };
      setPlan(working);
      log("pay", "STEP", `${step.title} → ${step.listing.resource}`);

      try {
        const result = await api.pay({
          demo: demoMode,
          chain: network,
          url: step.listing.resource,
          address: connected.address,
          maxAmount: Math.max(step.priceUsdc, 0.001),
          method: step.listing.metadata?.method,
        });
        const paidAmount = result.amountUsdc;
        spent = Number((spent + paidAmount).toFixed(6));
        if (demoMode && liveBalance.value != null) {
          liveBalance.value = Math.max(0, Number((liveBalance.value - paidAmount).toFixed(6)));
          setBalanceUsdc(liveBalance.value);
        }
        working = {
          ...working,
          spentTotal: spent,
          steps: working.steps.map((s) =>
            s.id === step.id
              ? {
                  ...s,
                  status: "completed",
                  result: result.response,
                  excerpt: excerptFromResult(result.response),
                  paidUsdc: paidAmount,
                }
              : s,
          ),
        };
        setPlan(working);
        log("ok", "STEP", `${step.title} paid ${paidAmount} USDC`);
      } catch (err) {
        ok = false;
        const message =
          err instanceof ApiError
            ? `${err.message}${err.body.hint ? ` — ${err.body.hint}` : ""}`
            : err instanceof Error
              ? err.message
              : "Step failed";
        working = {
          ...working,
          spentTotal: spent,
          steps: working.steps.map((s) =>
            s.id === step.id ? { ...s, status: "error", error: message } : s,
          ),
        };
        setPlan(working);
        log("error", "STEP", message);
        break;
      }
    }

    const assembled = assemblePlan(working);
    working = { ...working, assembled, spentTotal: spent };
    setPlan(working);
    setSessionSpent((s) => Number((s + spent).toFixed(6)));
    setHistory((prev) => [
      {
        id: working.id,
        title: working.title,
        prompt: working.prompt,
        spentUsdc: spent,
        estimatedUsdc: working.estimatedTotal,
        stepCount: working.steps.length,
        ts: Date.now(),
        ok,
      },
      ...prev.slice(0, 7),
    ]);
    log(ok ? "ok" : "warn", "RUN", ok ? `Assembled · ${spent} USDC` : `Stopped · ${spent} USDC spent`);
    if (ok) reveal(5);
    setExecuting(false);
  }

  async function handlePreset(id: string) {
    setBusyPreset(id);
    try {
      await decompose({ presetId: id, reveal: true });
    } finally {
      setBusyPreset(null);
    }
  }

  function handleDemoMode(next: boolean) {
    handleMode(next ? "demo" : network);
  }

  function handleNetwork(next: NetworkId) {
    handleMode(next);
  }

  function handleMode(next: AppMode) {
    const nextDemo = next === "demo";
    setDemoMode(nextDemo);
    if (!nextDemo) setNetwork(next);
    resetSession();
    log("info", "MODE", nextDemo ? "Demo" : next);
    void search(query, category);
    if (nextDemo) reveal(2);
    else setView(1);
  }

  const step = useMemo(() => {
    if (view === 1) return 1;
    if (plan?.assembled) return 5;
    if (executing) return 4;
    if (plan) return 3;
    if (wallet) return 2;
    return 1;
  }, [executing, plan, view, wallet]);

  const unlocked = (
    view === 1 ? (wallet ? 2 : 1) : plan?.assembled ? 5 : executing ? 4 : plan ? 3 : wallet ? 2 : 1
  ) as StageId;

  function resetFlow() {
    setPlan(null);
    setPrompt("");
    setSelected(null);
    setInspect(null);
    setExecuting(false);
  }

  function goWallet() {
    resetFlow();
    setView(1);
    setBurstStep(null);
  }

  function startAgain() {
    resetFlow();
    reveal(2);
  }

  function handleStageView(id: StageId) {
    if (id === 1) {
      goWallet();
      return;
    }
    setView(id);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <SiteHeader
        demoMode={demoMode}
        network={network}
        onMode={handleMode}
        address={wallet?.address ?? null}
        connected={Boolean(wallet)}
        balanceUsdc={balanceUsdc}
        onWallet={() => setView(1)}
      />

      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 px-4 py-3 sm:px-6">
        <FlowStepper
          current={step}
          view={view}
          onView={handleStageView}
          burstStep={burstStep}
          burstKey={burstKey}
          unlocked={unlocked}
        />

        <div key={view} className="stage-in flex min-h-0 flex-1 flex-col overflow-hidden">
          {view === 1 ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <WalletPanel
                demoMode={demoMode}
                network={network}
                wallet={wallet}
                email={email}
                balanceUsdc={balanceUsdc}
                connecting={connecting}
                funding={funding}
                funded={funded}
                activity={logs}
                onConnect={() => void handleConnect()}
                onFund={() => void handleFund()}
                onRefresh={() => void handleRefresh()}
                onDisconnect={() => void handleDisconnect()}
                onClearActivity={() => setLogs([])}
                onDemo={() => handleDemoMode(true)}
                onNetwork={handleNetwork}
              />
            </div>
          ) : null}

          {view === 2 ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-visible">
              <PresetGallery
                presets={presets}
                busyId={busyPreset}
                onRun={(id) => void handlePreset(id)}
                onLoad={(id) => void handlePreset(id)}
              />
              <div className="relative z-0 grid min-h-0 flex-1 gap-3 overflow-hidden md:grid-cols-2">
                <QueryComposer
                  prompt={prompt}
                  onPrompt={setPrompt}
                  decomposing={decomposing}
                  onDecompose={() => void decompose({ prompt })}
                />
                <MarketplacePanel
                  query={query}
                  onQuery={setQuery}
                  category={category}
                  onCategory={(value) => {
                    setCategory(value);
                    void search(query, value);
                  }}
                  onSearch={() => void search()}
                  searching={searching}
                  services={services}
                  total={total}
                  source={source}
                  note={note}
                  selected={selected}
                  onSelect={handleSelect}
                  onInspect={() => void handleInspect()}
                  onPay={() => setView(3)}
                  inspecting={inspecting}
                  inspect={inspect}
                />
              </div>
            </div>
          ) : null}

          {view === 3 ? (
            plan ? (
              <section className="grid min-h-0 flex-1 gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(16rem,0.85fr)]">
                <FlowTimeline
                  plan={plan}
                  executing={executing}
                  network={network}
                  onExecute={() => void executeCurrent()}
                  onRemove={(id) => setPlan((p) => (p ? removeStep(p, id) : p))}
                  onAlternative={(id, quality: QualityTier) =>
                    setPlan((p) => (p ? applyAlternative(p, id, quality) : p))
                  }
                  onDemo={() => handleDemoMode(true)}
                  onNetwork={handleNetwork}
                />
                <CostExplorer
                  plan={plan}
                  spendLimit={spendLimit}
                  onSpendLimit={setSpendLimit}
                  sessionSpent={sessionSpent}
                  history={history}
                  onReplay={(item) => {
                    setPrompt(item.prompt);
                    void decompose({ prompt: item.prompt });
                  }}
                />
              </section>
            ) : (
              <EmptyStage />
            )
          ) : null}

          {view === 4 ? (
            <div className="min-h-0 flex-1">
              {plan ? (
                <FlowTimeline
                  plan={plan}
                  executing={executing}
                  network={network}
                  onExecute={() => void executeCurrent()}
                  onRemove={(id) => setPlan((p) => (p ? removeStep(p, id) : p))}
                  onAlternative={(id, quality: QualityTier) =>
                    setPlan((p) => (p ? applyAlternative(p, id, quality) : p))
                  }
                  onDemo={() => handleDemoMode(true)}
                  onNetwork={handleNetwork}
                />
              ) : (
                <EmptyStage />
              )}
            </div>
          ) : null}

          {view === 5 ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <div className="min-h-0 flex-1 overflow-hidden rounded-2xl">
                {plan?.assembled ? <AssembledResult plan={plan} /> : <EmptyStage />}
              </div>
              <div className="flex shrink-0 items-center justify-center gap-3 pb-1">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 min-w-[10rem] cursor-pointer border-cyan/40 bg-card/80 px-6 text-base shadow-[0_0_28px_-10px_oklch(0.84_0.13_196/0.55)] hover:border-cyan/65 hover:bg-card"
                  onClick={goWallet}
                >
                  <WalletIcon />
                  Wallet
                </Button>
                <Button
                  size="lg"
                  className="h-12 min-w-[10rem] cursor-pointer px-6 text-base"
                  onClick={startAgain}
                >
                  <SparkleIcon />
                  New
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <ConnectDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        network={network}
        onConnected={applyWallet}
        onLog={log}
      />
      <FundDialog
        open={fundOpen}
        onOpenChange={setFundOpen}
        network={network}
        address={wallet?.address ?? null}
        message={fundMessage}
        commands={fundCommands}
        faucetUrl={fundUrl}
        balanceUsdc={balanceUsdc}
        watching={!demoMode && Boolean(wallet?.address)}
      />
    </div>
  );
}

function EmptyStage() {
  return (
    <div className="glass flex min-h-56 items-center justify-center rounded-2xl">
      <span className="size-1.5 rounded-full bg-cyan/50" />
    </div>
  );
}
