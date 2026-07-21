import { Button } from "@/components/site/Button";
import { Container } from "@/components/site/Container";

export function CTA() {
  return (
    <section className="py-16">
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-900 px-6 py-14 text-white shadow-sm dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Start integrating Lumina
            </h2>
            <p className="mt-4 text-pretty text-base leading-7 text-zinc-200">
              Build a crypto payment flow that looks and feels like modern fintech — with open-source
              infrastructure and Stellar settlement.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button href="https://github.com/StellarLumina/Lumina" variant="primary">
                View on GitHub
              </Button>
              <Button href="#" variant="secondary">
                Read the docs
              </Button>
            </div>
            <p className="mt-6 text-xs text-zinc-300">
              Note: link placeholders can be updated once docs and dashboard routes are finalized.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
