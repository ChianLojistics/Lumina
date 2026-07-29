"use client";

import { useState } from "react";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { Chart } from "@/components/dashboard/Chart";
import { PaymentTable } from "@/components/dashboard/PaymentTable";
import { Plus, ArrowUpRight, Bell, Clock, CheckCircle, AlertCircle } from "lucide-react";
import type { PaymentStatus } from "@/components/dashboard/PaymentTable";

// Mock data - replace with actual API calls
const mockPayments = [
  {
    id: "pay_1234567890",
    amount: 2500.00,
    currency: "USDC",
    status: "confirmed" as PaymentStatus,
    customerEmail: "customer1@example.com",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    description: "Premium subscription",
  },
  {
    id: "pay_1234567891",
    amount: 150.00,
    currency: "USDC",
    status: "pending" as PaymentStatus,
    customerEmail: "customer2@example.com",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    description: "One-time purchase",
  },
  {
    id: "pay_1234567892",
    amount: 5000.00,
    currency: "USDC",
    status: "confirmed" as PaymentStatus,
    customerEmail: "customer3@example.com",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    description: "Enterprise plan",
  },
  {
    id: "pay_1234567893",
    amount: 75.00,
    currency: "USDC",
    status: "failed" as PaymentStatus,
    customerEmail: "customer4@example.com",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    description: "Basic plan",
  },
  {
    id: "pay_1234567894",
    amount: 3200.00,
    currency: "USDC",
    status: "confirmed" as PaymentStatus,
    customerEmail: "customer5@example.com",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    description: "Annual subscription",
  },
];

const mockChartData = [
  { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), amount: 4500 },
  { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(), amount: 5200 },
  { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), amount: 3800 },
  { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), amount: 6100 },
  { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), amount: 4900 },
  { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), amount: 7200 },
  { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(), amount: 5800 },
];

const notifications = [
  { id: 1, type: "success", message: "Payment of $2,500.00 confirmed", time: "30 min ago" },
  { id: 2, type: "warning", message: "Payment of $75.00 failed", time: "1 day ago" },
  { id: 3, type: "info", message: "New withdrawal request submitted", time: "2 days ago" },
];

export default function DashboardPage() {
  const [chartPeriod, setChartPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Dashboard Overview
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Monitor your payments, balance, and business performance
        </p>
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-zinc-500" />
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Recent Notifications</h3>
        </div>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              {notification.type === "success" && (
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              )}
              {notification.type === "warning" && (
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              )}
              {notification.type === "info" && (
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm text-zinc-900 dark:text-zinc-50">{notification.message}</p>
                <p className="text-xs text-zinc-500 mt-1">{notification.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <BalanceCard balance={15250.00} change={12.5} changePeriod="last month" />
        
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Total Payments
            </span>
          </div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
            {mockPayments.length}
          </div>
          <div className="text-sm text-zinc-500">This month</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <ArrowUpRight className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Success Rate
            </span>
          </div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
            94.5%
          </div>
          <div className="text-sm text-zinc-500">Last 30 days</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Pending
            </span>
          </div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
            {mockPayments.filter(p => p.status === "pending").length}
          </div>
          <div className="text-sm text-zinc-500">Awaiting confirmation</div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              Payment Volume
            </h3>
            <p className="text-sm text-zinc-500">Track your payment trends over time</p>
          </div>
          <div className="flex gap-2">
            {(["daily", "weekly", "monthly"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setChartPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  chartPeriod === period
                    ? "bg-emerald-500 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
        <Chart data={mockChartData} type="line" period={chartPeriod} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button className="flex items-center gap-4 p-6 bg-emerald-600 hover:bg-emerald-700 rounded-2xl text-white transition-colors group">
          <div className="p-3 bg-white/20 rounded-lg">
            <Plus className="w-6 h-6" />
          </div>
          <div className="text-left">
            <div className="font-semibold mb-1">Create Payment</div>
            <div className="text-sm text-emerald-100">Generate a new payment link</div>
          </div>
          <ArrowUpRight className="w-5 h-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        <button className="flex items-center gap-4 p-6 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-800 transition-colors group">
          <div className="p-3 bg-emerald-500/10 rounded-lg">
            <ArrowUpRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">Withdraw Funds</div>
            <div className="text-sm text-zinc-500">Transfer balance to bank account</div>
          </div>
          <ArrowUpRight className="w-5 h-5 ml-auto text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      {/* Recent Payments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Recent Payments
          </h3>
          <a
            href="/dashboard/payments"
            className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            View all
          </a>
        </div>
        <PaymentTable payments={mockPayments.slice(0, 5)} showSearch={false} showFilter={false} showExport={false} />
      </div>
    </div>
  );
}
