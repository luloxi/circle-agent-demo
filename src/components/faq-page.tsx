"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SiteHeader } from "@/components/site-header";

const STEPS = [
  { id: "01", label: "Wallet", body: "Connect a Circle Agent Wallet. It holds USDC and signs each hop." },
  { id: "02", label: "Query", body: "Pick a preset or write a prompt. The composer turns it into Marketplace steps." },
  { id: "03", label: "Cost", body: "Every service has a USDC price. Swap economy / premium before you spend." },
  { id: "04", label: "Run", body: "Inspect → estimate → pay. Official buyer path, one nanopayment per step." },
  { id: "05", label: "Done", body: "The paid responses assemble into one answer. Start again or go back to the wallet." },
];

const PILLARS = [
  {
    title: "Agent Wallet",
    body: "A policy-controlled USDC wallet for agents — not a browser extension, not a credit card. Live mode uses the Circle CLI on this machine.",
    image: "/faq/wallet.jpg",
    href: "https://developers.circle.com/agent-stack/agent-wallets",
  },
  {
    title: "Marketplace",
    body: "x402 services an agent can discover without an API key: prices, search, social, prediction markets. Pay per call.",
    image: "/faq/marketplace.jpg",
    href: "https://agents.circle.com/services",
  },
  {
    title: "USDC on Arc",
    body: "Arc is Circle’s stablecoin-native L1. The app opens in Demo Mode; switch to Arc Testnet when you want to settle on Circle’s L1 with faucet USDC.",
    image: "/faq/hero.jpg",
    href: "https://www.arc.io/",
  },
];

const LINKS = [
  { href: "/agent.md", label: "Agent skill" },
  { href: "https://developers.circle.com/agent-stack", label: "Agent Stack" },
  { href: "https://agents.circle.com/services", label: "Catalog" },
  { href: "https://www.arc.io/", label: "Arc" },
  { href: "https://faucet.circle.com", label: "Faucet" },
  { href: "https://www.circle.com/usdc", label: "USDC" },
];

export function FaqPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <SiteHeader variant="doc" />

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <section className="relative mt-6 overflow-hidden rounded-[1.6rem] ring-1 ring-white/10">
          <Image
            src="/faq/hero.jpg"
            alt=""
            width={1600}
            height={900}
            className="h-[22rem] w-full object-cover sm:h-[26rem]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b16] via-[#070b16]/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <p className="text-[11px] tracking-[0.22em] text-cyan uppercase">
              Arc hackathon · Circle Agent Stack
            </p>
            <h1 className="font-heading mt-2 max-w-2xl text-3xl tracking-tight sm:text-4xl">
              An agent that pays for what it needs.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">
              Agent Query Composer is a buyer-side demo: decompose a query, price
              each Marketplace hop in USDC, settle nanopayments, assemble the answer.
            </p>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {PILLARS.map((item) => (
            <a
              key={item.title}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="glass group overflow-hidden rounded-2xl"
            >
              <div className="relative h-36 overflow-hidden">
                <Image
                  src={item.image}
                  alt=""
                  width={800}
                  height={450}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <div className="p-4">
                <h2 className="text-sm tracking-tight">{item.title}</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            </a>
          ))}
        </section>

        <section className="mt-12">
          <p className="text-[11px] tracking-[0.18em] text-cyan uppercase">The path</p>
          <h2 className="font-heading mt-1 text-2xl tracking-tight">Wallet → Query → Cost → Run → Done</h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step) => (
              <li key={step.id} className="glass rounded-2xl p-4">
                <span className="font-mono text-[11px] text-cyan">{step.id}</span>
                <h3 className="mt-2 text-sm">{step.label}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12 grid gap-4 lg:grid-cols-2">
          <article className="overflow-hidden rounded-2xl ring-1 ring-white/10">
            <div className="aspect-video bg-black">
              <iframe
                className="h-full w-full"
                src="https://www.youtube-nocookie.com/embed/R7Di8ex0tdw"
                title="AI Agents on Arc with USDC — kick-off"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="p-4">
              <h3 className="text-sm">Agents on Arc with USDC</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Hackathon kick-off: why Arc is the settlement layer and USDC is the money.
              </p>
            </div>
          </article>
          <article className="overflow-hidden rounded-2xl ring-1 ring-white/10">
            <div className="aspect-video bg-black">
              <iframe
                className="h-full w-full"
                src="https://www.youtube-nocookie.com/embed/8zNFUGVKzIM?start=1000"
                title="Circle Agent Stack on Arc"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="p-4">
              <h3 className="text-sm">Circle Agent Stack</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">
                CLI, Agent Wallet, and gas-abstracted x402 nanopayments — the buyer surface this app uses.
              </p>
            </div>
          </article>
        </section>

        <section className="glass mt-12 rounded-2xl px-5">
          <Accordion type="multiple" defaultValue={["what", "wallet", "query", "cost", "run", "done"]} className="w-full">
            <AccordionItem value="what">
              <AccordionTrigger>What is this?</AccordionTrigger>
              <AccordionContent>
                <p>
                  A booth demo of Circle Agent Stack for the Arc hackathon. Most agents
                  stop when they hit a paywall or a missing API key. This one pays in
                  USDC and keeps going.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="wallet">
              <AccordionTrigger>Wallet</AccordionTrigger>
              <AccordionContent>
                <p>Connect a Circle Agent Wallet first. It holds USDC and signs each hop.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="query">
              <AccordionTrigger>Query</AccordionTrigger>
              <AccordionContent>
                <p>Pick a preset or write a prompt. The composer turns it into Marketplace steps.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="cost">
              <AccordionTrigger>Cost</AccordionTrigger>
              <AccordionContent>
                <p>Every service has a USDC price. Swap economy / premium before you spend.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="run">
              <AccordionTrigger>Run</AccordionTrigger>
              <AccordionContent>
                <p>
                  Inspect → estimate → pay. Official buyer path, one nanopayment per
                  step. Chain comes from the seller&apos;s accepts[], method from
                  inspect (-X).
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="done">
              <AccordionTrigger>Done</AccordionTrigger>
              <AccordionContent>
                <p>The paid responses assemble into one answer. Start again or go back to the wallet.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="x402">
              <AccordionTrigger>x402</AccordionTrigger>
              <AccordionContent>
                <p>
                  Official buyer path: inspect → estimate → pay. Gateway
                  nanopayments are first-class. Agent Wallet pays are gas-abstracted —
                  USDC only, no separate gas token.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="demo">
              <AccordionTrigger>Demo</AccordionTrigger>
              <AccordionContent>
                <p>
                  The app opens in Demo Mode — mock wallet, always succeeds. Live mode
                  uses the public Discovery API plus the Circle CLI on this machine.
                  Pick Arc Testnet or Base Mainnet in the header.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="agents">
              <AccordionTrigger>Can another agent pay here?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Yes — with its own Circle Agent Wallet, never this host&apos;s
                  env. Fetch{" "}
                  <a href="/agent.md" className="text-cyan underline">
                    /agent.md
                  </a>{" "}
                  and follow it. Live pay on the public Vercel URL is disabled
                  so visitors cannot spend the deployer&apos;s USDC.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="arc">
              <AccordionTrigger>Why Arc?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Arc is Circle’s stablecoin-native L1 — the economic OS this
                  hackathon is built on. You can hold testnet USDC in an Agent Wallet
                  today. The public Marketplace catalog is still mainnet-only (no
                  listings advertise eip155:5042002), so live Execute on Arc has
                  nothing payable yet. Use Demo Mode for the full walkthrough.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <nav className="mt-10 flex flex-wrap items-center gap-4 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="hover:text-cyan">
              {link.label}
            </a>
          ))}
          <Link href="/" className="ml-auto text-cyan">
            Back to composer
          </Link>
        </nav>
      </main>
    </div>
  );
}
