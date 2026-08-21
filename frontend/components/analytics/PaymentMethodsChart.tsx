"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface PaymentMethodsChartProps {
  data: Array<{
    method: string;
    count: number;
    percentage: number;
    amount: number;
  }>;
}

const COLORS = ["rgb(16, 185, 129)", "rgb(59, 130, 246)", "rgb(168, 85, 247)", "rgb(249, 115, 22)"];

export function PaymentMethodsChart({ data }: PaymentMethodsChartProps) {
  const chartData = data.map((item, index) => ({
    name: item.method,
    value: item.count,
    amount: item.amount,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number, name: string, props: any) => [
              `${value} transactions`,
              `$${props.payload.amount.toLocaleString()}`
            ]}
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              border: "1px solid #e5e5e5",
              borderRadius: "8px",
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value: string, entry: any) => (
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {value} ({entry.payload.value})
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Legend with percentages */}
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={item.method} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-zinc-600 dark:text-zinc-400">{item.method}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-zinc-900 dark:text-zinc-50 font-medium">
                {item.percentage.toFixed(1)}%
              </span>
              <span className="text-zinc-500">
                ${item.amount.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
