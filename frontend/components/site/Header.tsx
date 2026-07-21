import Link from "next/link";

import { Container } from "@/components/site/Container";

const navItems: Array<{ label: string; href: string }> = [
  { label: "About", href: "#about" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "FAQ", href: "#faq" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/60 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-black/30">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
              aria-label="Lumina"
            >
              Lumina
            </Link>
            <span className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:inline">
              Stripe for crypto payments
            </span>
          </div>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="https://github.com/StellarLumina/Lumina"
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-3 py-2 text-sm font-semibold text-zinc-700 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:text-zinc-300 dark:hover:text-white"
            >
              GitHub
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
