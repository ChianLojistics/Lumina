"use client";

import { Users, TrendingUp, ArrowRight, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface CustomerSegment {
  segment: string;
  count: number;
  avgSpent: number;
  avgTransactions: number;
  churnRate: number;
}

interface CustomerCohort {
  cohort: string;
  period: string;
  customers: number;
  retention: number;
  avgSpent: number;
}

export function CustomerAnalytics() {
  // Mock data
  const segments: CustomerSegment[] = [
    { segment: "High Value", count: 234, avgSpent: 8500, avgTransactions: 12, churnRate: 5 },
    { segment: "Medium Value", count: 567, avgSpent: 2500, avgTransactions: 5, churnRate: 12 },
    { segment: "Low Value", count: 1234, avgSpent: 350, avgTransactions: 2, churnRate: 25 },
  ];

  const cohorts: CustomerCohort[] = [
    { cohort: "Cohort 1", period: "Jan 2024", customers: 156, retention: 78, avgSpent: 4200 },
    { cohort: "Cohort 2", period: "Feb 2024", customers: 189, retention: 72, avgSpent: 3800 },
    { cohort: "Cohort 3", period: "Mar 2024", customers: 234, retention: 68, avgSpent: 3500 },
    { cohort: "Cohort 4", period: "Apr 2024", customers: 267, retention: 65, avgSpent: 3200 },
  ];

  const totalCustomers = segments.reduce((sum, s) => sum + s.count, 0);
  const activeCustomers = Math.round(totalCustomers * 0.68);
  const newCustomers = Math.round(totalCustomers * 0.15);
  const returningCustomers = Math.round(totalCustomers * 0.53);

  const SEGMENT_COLORS = ["rgb(16, 185, 129)", "rgb(59, 130, 246)", "rgb(168, 85, 247)"];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Total Customers
            </span>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {totalCustomers.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Active (30d)
            </span>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {activeCustomers.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              New (30d)
            </span>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {newCustomers.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Returning
            </span>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {returningCustomers.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Customer Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
            Customer Segments
          </h3>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segments}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {segments.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString(), "Customers"]}
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    border: "1px solid #e5e5e5",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 space-y-3">
            {segments.map((segment, index) => (
              <div key={segment.segment} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: SEGMENT_COLORS[index % SEGMENT_COLORS.length] }}
                  />
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">{segment.segment}</div>
                    <div className="text-xs text-zinc-500">
                      ${segment.avgSpent.toLocaleString()} avg • {segment.avgTransactions} txns
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {segment.count.toLocaleString()}
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400">
                    {segment.churnRate}% churn
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cohort Analysis */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
            Cohort Retention
          </h3>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cohorts}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                <XAxis 
                  dataKey="cohort"
                  className="text-xs text-zinc-500"
                />
                <YAxis 
                  tickFormatter={(value) => `${value}%`}
                  className="text-xs text-zinc-500"
                />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, "Retention"]}
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    border: "1px solid #e5e5e5",
                    borderRadius: "8px",
                  }}
                />
                <Bar 
                  dataKey="retention" 
                  fill="rgb(16, 185, 129)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 space-y-2">
            {cohorts.map((cohort) => (
              <div key={cohort.cohort} className="flex items-center justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">{cohort.cohort}</span>
                <div className="flex items-center gap-4">
                  <span className="text-zinc-900 dark:text-zinc-50 font-medium">
                    {cohort.customers} customers
                  </span>
                  <span className={`font-medium ${
                    cohort.retention >= 70 ? "text-emerald-600 dark:text-emerald-400" :
                    cohort.retention >= 60 ? "text-yellow-600 dark:text-yellow-400" :
                    "text-red-600 dark:text-red-400"
                  }`}>
                    {cohort.retention}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
