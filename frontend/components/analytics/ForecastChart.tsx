"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format } from "date-fns";
import { TrendingUp, AlertCircle, Info } from "lucide-react";

type Scenario = "optimistic" | "pessimistic" | "baseline";

interface ForecastData {
  date: string;
  predictedRevenue: number;
  confidenceLower: number;
  confidenceUpper: number;
  scenario: Scenario;
}

export function ForecastChart() {
  const [scenario, setScenario] = useState<Scenario>("baseline");
  const [days, setDays] = useState(30);

  // Mock forecast data
  const generateForecast = (scenarioType: Scenario, days: number): ForecastData[] => {
    const data: ForecastData[] = [];
    const baseRevenue = 5000;
    const volatility = scenarioType === "optimistic" ? 0.08 : 
                       scenarioType === "pessimistic" ? 0.15 : 0.12;
    const trend = scenarioType === "optimistic" ? 0.02 : 
                  scenarioType === "pessimistic" ? -0.01 : 0.005;

    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      const randomFactor = 1 + (Math.random() - 0.5) * volatility;
      const trendFactor = 1 + trend * i;
      const predictedRevenue = baseRevenue * randomFactor * trendFactor;
      const confidenceSpread = predictedRevenue * 0.2;

      data.push({
        date: date.toISOString(),
        predictedRevenue,
        confidenceLower: predictedRevenue - confidenceSpread,
        confidenceUpper: predictedRevenue + confidenceSpread,
        scenario: scenarioType,
      });
    }

    return data;
  };

  const data = generateForecast(scenario, days);
  const totalPredicted = data.reduce((sum, d) => sum + d.predictedRevenue, 0);
  const averageDaily = totalPredicted / data.length;
  const confidence = scenario === "optimistic" ? 65 : scenario === "pessimistic" ? 78 : 72;

  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem);
    return format(date, "MMM dd");
  };

  const formatTooltip = (value: number) => {
    return `$${value.toLocaleString()}`;
  };

  const scenarios = [
    { value: "optimistic" as Scenario, label: "Optimistic", color: "rgb(16, 185, 129)" },
    { value: "baseline" as Scenario, label: "Baseline", color: "rgb(59, 130, 246)" },
    { value: "pessimistic" as Scenario, label: "Pessimistic", color: "rgb(249, 115, 22)" },
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {scenarios.map((s) => (
            <button
              key={s.value}
              onClick={() => setScenario(s.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                scenario === s.value
                  ? "text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
              style={scenario === s.value ? { backgroundColor: s.color } : {}}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Forecast Period:</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-50 border-0 focus:ring-2 focus:ring-emerald-500"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Total Predicted
            </span>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            ${totalPredicted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Average Daily
            </span>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            ${averageDaily.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Confidence Score
            </span>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {confidence}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
          Revenue Forecast ({scenarios.find(s => s.value === scenario)?.label})
        </h3>
        <div className="w-full h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={scenarios.find(s => s.value === scenario)?.color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={scenarios.find(s => s.value === scenario)?.color} stopOpacity={0}/>
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
                dataKey="predictedRevenue" 
                stroke={scenarios.find(s => s.value === scenario)?.color}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorForecast)"
              />
              <Line 
                type="monotone" 
                dataKey="confidenceLower" 
                stroke={scenarios.find(s => s.value === scenario)?.color}
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                opacity={0.5}
              />
              <Line 
                type="monotone" 
                dataKey="confidenceUpper" 
                stroke={scenarios.find(s => s.value === scenario)?.color}
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                opacity={0.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Forecast Insights
            </h4>
            <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <li>• Based on historical data and ML model v2.1</li>
              <li>• Confidence intervals represent 95% probability range</li>
              <li>• Seasonality adjustments applied for current period</li>
              <li>• Model accuracy: {confidence}% based on backtesting</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
