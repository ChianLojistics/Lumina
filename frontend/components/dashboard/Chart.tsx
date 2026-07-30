"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format } from "date-fns";

interface ChartData {
  date: string;
  amount: number;
}

interface ChartProps {
  data: ChartData[];
  type?: "line" | "bar";
  period?: "daily" | "weekly" | "monthly";
}

export function Chart({ data, type = "line", period = "daily" }: ChartProps) {
  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem);
    switch (period) {
      case "daily":
        return format(date, "MMM dd");
      case "weekly":
        return format(date, "MMM dd");
      case "monthly":
        return format(date, "MMM yyyy");
      default:
        return format(date, "MMM dd");
    }
  };

  const formatTooltip = (value: number) => {
    return `$${value.toLocaleString()}`;
  };

  if (type === "bar") {
    return (
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
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
              formatter={(value: number) => [`$${value.toLocaleString()}`, "Volume"]}
              labelFormatter={(label) => formatXAxis(label)}
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                border: "1px solid #e5e5e5",
                borderRadius: "8px",
              }}
            />
            <Bar 
              dataKey="amount" 
              fill="rgb(16, 185, 129)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
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
            formatter={(value: number) => [`$${value.toLocaleString()}`, "Volume"]}
            labelFormatter={(label) => formatXAxis(label)}
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              border: "1px solid #e5e5e5",
              borderRadius: "8px",
            }}
          />
          <Line 
            type="monotone" 
            dataKey="amount" 
            stroke="rgb(16, 185, 129)" 
            strokeWidth={2}
            dot={{ fill: "rgb(16, 185, 129)", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
