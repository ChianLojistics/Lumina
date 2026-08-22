"use client";

import { Funnel, ArrowDown, AlertTriangle } from "lucide-react";

interface FunnelStage {
  stage: string;
  count: number;
  conversionRate: number;
  dropOff: number;
}

export function ConversionFunnel() {
  // Mock funnel data
  const funnelData: FunnelStage[] = [
    { stage: "Page View", count: 10000, conversionRate: 100, dropOff: 0 },
    { stage: "Initiate Checkout", count: 5000, conversionRate: 50, dropOff: 50 },
    { stage: "Add Payment", count: 3000, conversionRate: 30, dropOff: 40 },
    { stage: "Confirm Payment", count: 2000, conversionRate: 20, dropOff: 33 },
    { stage: "Complete Payment", count: 1500, conversionRate: 15, dropOff: 25 },
  ];

  const overallConversion = funnelData[funnelData.length - 1].conversionRate;
  const maxCount = funnelData[0].count;

  const getStageColor = (index: number) => {
    const colors = [
      "bg-zinc-200 dark:bg-zinc-700",
      "bg-blue-200 dark:bg-blue-800",
      "bg-blue-300 dark:bg-blue-700",
      "bg-emerald-300 dark:bg-emerald-700",
      "bg-emerald-500 dark:bg-emerald-600",
    ];
    return colors[index % colors.length];
  };

  const getDropOffSeverity = (dropOff: number) => {
    if (dropOff > 40) return { color: "text-red-600 dark:text-red-400", icon: AlertTriangle };
    if (dropOff > 30) return { color: "text-yellow-600 dark:text-yellow-400", icon: AlertTriangle };
    return { color: "text-emerald-600 dark:text-emerald-400", icon: null };
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Funnel className="w-5 h-5 text-zinc-500" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Conversion Funnel
          </h3>
        </div>
        <div className="text-sm text-zinc-500">
          Overall Conversion: <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            {overallConversion}%
          </span>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="space-y-4">
        {funnelData.map((stage, index) => {
          const widthPercentage = (stage.count / maxCount) * 100;
          const severity = getDropOffSeverity(stage.dropOff);
          const SeverityIcon = severity.icon;

          return (
            <div key={stage.stage} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {stage.stage}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {stage.count.toLocaleString()}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {stage.conversionRate}%
                  </span>
                  {index > 0 && (
                    <span className={`flex items-center gap-1 ${severity.color}`}>
                      {SeverityIcon && <SeverityIcon className="w-4 h-4" />}
                      -{stage.dropOff}%
                    </span>
                  )}
                </div>
              </div>

              {/* Bar */}
              <div className="relative h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
                <div
                  className={`h-full ${getStageColor(index)} transition-all duration-500`}
                  style={{ width: `${widthPercentage}%` }}
                />
                <div className="absolute inset-0 flex items-center px-4">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mix-blend-difference">
                    {stage.count.toLocaleString()}
                  </span>
                </div>
              </div>

              {index < funnelData.length - 1 && (
                <div className="flex justify-center">
                  <ArrowDown className="w-4 h-4 text-zinc-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Insights */}
      <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              Optimization Opportunities
            </h4>
            <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <li>• Highest drop-off at "Initiate Checkout" (50%) - consider simplifying checkout flow</li>
              <li>• "Add Payment" stage shows 40% drop-off - review payment method options</li>
              <li>• Overall conversion of 15% is below industry average (20-25%)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
