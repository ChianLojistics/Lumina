"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface GeographicChartProps {
  data: Array<{
    country: string;
    count: number;
    amount: number;
  }>;
}

export function GeographicChart({ data }: GeographicChartProps) {
  const chartData = data.map(item => ({
    country: item.country.length > 15 ? item.country.substring(0, 15) + "..." : item.country,
    fullCountry: item.country,
    count: item.count,
    amount: item.amount,
  }));

  const formatTooltip = (value: number, name: string) => {
    if (name === "count") return value.toLocaleString();
    if (name === "amount") return `$${value.toLocaleString()}`;
    return value;
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
          <XAxis 
            type="number"
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            className="text-xs text-zinc-500"
          />
          <YAxis 
            type="category"
            dataKey="country"
            width={100}
            tickFormatter={(value) => value}
            className="text-xs text-zinc-500"
          />
          <Tooltip 
            formatter={(value: number, name: string, props: any) => [
              name === "count" ? value.toLocaleString() : `$${value.toLocaleString()}`,
              name === "count" ? "Transactions" : "Amount"
            ]}
            labelFormatter={(label) => props?.payload?.fullCountry || label}
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              border: "1px solid #e5e5e5",
              borderRadius: "8px",
            }}
          />
          <Bar 
            dataKey="amount" 
            fill="rgb(59, 130, 246)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      
      {/* Summary */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
          <div className="text-xs text-zinc-500 mb-1">Top Country</div>
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {data[0]?.country}
          </div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
          <div className="text-xs text-zinc-500 mb-1">Total Countries</div>
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {data.length}
          </div>
        </div>
      </div>
    </div>
  );
}
