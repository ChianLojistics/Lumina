import { Section } from "@/components/site/Section";

const features: Array<{ title: string; body: string }> = [
  {
    title: "Multi-asset payment gateway",
    body: "Accept BTC, ETH, USDC, and XLM with a unified payment model and consistent status tracking.",
  },
  {
    title: "USDC settlement on Stellar",
    body: "Standardize settlement into stablecoins using fast, low-fee Stellar transfers and Soroban contracts.",
  },
  {
    title: "On-ramp + off-ramp",
    body: "Move between fiat and USDC via card/bank rails (where available), with clear operational workflows.",
  },
  {
    title: "Escrow + programmable payouts",
    body: "Unlock marketplace flows with escrow, payment splits, and subscription billing on-chain.",
  },
  {
    title: "Merchant dashboard",
    body: "Track balances, analytics, withdrawals, and API keys in a modern dashboard experience.",
  },
  {
    title: "Developer-first tooling",
    body: "REST endpoints, webhooks, and SDKs so you can integrate quickly and iterate without friction.",
  },
];

export function Features() {
  return (
    <Section
      id="features"
      eyebrow="Features"
      title="Everything you need to accept crypto — without the chaos"
      description="Build a full payment experience: checkout, conversion, settlement, and payouts."
    >
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5"
          >
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{f.title}</h3>
            <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{f.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
