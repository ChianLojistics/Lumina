"use client";

import { useMemo, useState } from "react";

import { Section } from "@/components/site/Section";

const items = [
  {
    q: "Is Lumina a wallet or an exchange?",
    a: "Lumina is payment infrastructure. It provides a checkout + API, plus settlement and programmable flows on Stellar via Soroban smart contracts.",
  },
  {
    q: "What do payments settle as?",
    a: "Payments settle as USDC on the Stellar network. This makes accounting and payouts more consistent for merchants.",
  },
  {
    q: "Is Lumina production-ready today?",
    a: "The repo is actively building toward an MVP. The landing page reflects the intended product scope (gateway, ramps, escrow, splits, subscriptions).",
  },
  {
    q: "Can I contribute?",
    a: "Yes — contributions across Soroban contracts, NestJS services, frontend UI, docs, and testing are welcome.",
  },
] as const;

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const idBase = useMemo(() => "faq", []);

  return (
    <Section
      id="faq"
      eyebrow="FAQ"
      title="Common questions"
      description="Quick answers about what Lumina is building and how it works."
    >
      <div className="mx-auto max-w-3xl divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
        {items.map((item, idx) => {
          const isOpen = open === idx;
          const buttonId = `${idBase}-button-${idx}`;
          const panelId = `${idBase}-panel-${idx}`;

          return (
            <div key={item.q} className="p-6">
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : idx)}
                className="flex w-full items-center justify-between gap-6 text-left"
              >
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {item.q}
                </span>
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 dark:border-white/10 dark:text-zinc-300"
                  aria-hidden
                >
                  {isOpen ? "–" : "+"}
                </span>
              </button>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={isOpen ? "mt-3" : "mt-3 hidden"}
              >
                <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">{item.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
