import Link from "next/link";

import { Container } from "@/components/site/Container";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 py-10 dark:border-white/10">
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Lumina</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Open-source crypto payments with Stellar settlement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="#about"
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
            >
              About
            </Link>
            <Link
              href="#features"
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
            >
              Features
            </Link>
            <Link
              href="https://github.com/StellarLumina/Lumina"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
            >
              GitHub
            </Link>
          </div>
        </div>

        <p className="mt-8 text-xs text-zinc-500 dark:text-zinc-400">
          MIT © {new Date().getFullYear()} Lumina Contributors
        </p>
      </Container>
    </footer>
  );
}
