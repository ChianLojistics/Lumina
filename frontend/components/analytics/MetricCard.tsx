"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  name: string;
  value: number;
  change: number;
  changePeriod: string;
  trend: "up" | "down" | "neutral";
}

const icons = {
  revenue: DollarSign,
  volume: CreditCard,
  success: Activity,
  aov: TrendingUp,
};

export function MetricCard({ name, value, change, changePeriod, trend }: MetricCardProps) {
  const isPositive = change >= 0;
  const formattedValue = name === "Success Rate" 
    ? `${value.toFixed(1)}%` 
    : `$${value.toLocaleString()}`;

  const Icon = icons[name.toLowerCase().replace(" ", "") as keyof typeof icons] 
    ? icons[name.toLowerCase().replace(" ", "") as keyof typeof icons]
    : Activity;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${
            trend === "up" 
              ? "bg-emerald-500/10" 
              : trend === "down" 
              ? "bg-red-500/10" 
              : "bg-zinc-500/10"
          }`}>
            <Icon className={`w-5 h-5 ${
              trend === "up" 
                ? "text-emerald-600 dark:text-emerald-400" 
                : trend === "down" 
                ? "text-red-600 dark:text-red-400" 
                : "text-zinc-600 dark:text-zinc-400"
            }`} />
          </div>
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {name}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
          {formattedValue}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          isPositive 
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
            : "bg-red-500/10 text-red-600 dark:text-red-400"
        }`}>
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : change < 0 ? (
            <TrendingDown className="w-3 h-3" />
          ) : (
            <Minus className="w-3 h-3" />
          )}
          <span>{Math.abs(change).toFixed(1)}%</span>
        </div>
        <span className="text-xs text-zinc-500">vs {changePeriod}</span>
      </div>
    </div>
  );
}
