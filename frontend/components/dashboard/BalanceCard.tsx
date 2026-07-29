"use client";

import { Wallet, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";

interface BalanceCardProps {
  balance: number;
  change: number;
  changePeriod: string;
}

export function BalanceCard({ balance, change, changePeriod }: BalanceCardProps) {
  const isPositive = change >= 0;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Total Balance
          </span>
        </div>
        <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
          <ArrowUpRight className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      <div className="mb-4">
        <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
          ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-sm text-zinc-500">USDC</div>
      </div>

      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          isPositive 
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
            : "bg-red-500/10 text-red-600 dark:text-red-400"
        }`}>
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{Math.abs(change)}%</span>
        </div>
        <span className="text-xs text-zinc-500">vs {changePeriod}</span>
      </div>
    </div>
  );
}
