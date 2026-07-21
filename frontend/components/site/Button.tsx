import Link from "next/link";

type ButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
};

export function Button({ href, children, variant = "primary" }: ButtonProps) {
  const className =
    variant === "primary"
      ? "inline-flex items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      : "inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white/70 px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10";

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
