"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format } from "date-fns";

interface RevenueChartProps {
  data: Array<{ date: string; value: number }>;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem);
    return format(date, "MMM dd");
  };

  const formatTooltip = (value: number) => {
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgb(16, 185, 129)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="rgb(16, 185, 129)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatXAxis}
            className="text-xs text-zinc-500"
          />
          <YAxis 
            tickFormatter={formatTooltip}
            className="text-xs text-zinc-500"
          />
          <Tooltip 
            formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
            labelFormatter={(label) => formatXAxis(label)}
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              border: "1px solid #e5e5e5",
              borderRadius: "8px",
            }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="rgb(16, 185, 129)" 
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
