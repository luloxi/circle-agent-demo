const LINKS = [
  { href: "https://developers.circle.com/agent-stack", label: "Docs" },
  { href: "https://agents.circle.com/services", label: "Catalog" },
  { href: "https://faucet.circle.com", label: "Faucet" },
];

export function SiteFooter() {
  return (
    <footer className="py-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <span className="text-[11px] tracking-[0.16em] text-muted-foreground/70 uppercase">
          AQC
        </span>
        <nav className="flex gap-5 text-[11px] tracking-wide text-muted-foreground">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-cyan"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
