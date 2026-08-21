"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, TrendingDown, DollarSign, Users, 
  CreditCard, Activity, Calendar, Download, 
  BarChart3, PieChart, Map, LineChart, 
  Filter, RefreshCw, AlertTriangle 
} from "lucide-react";
import { MetricCard } from "@/components/analytics/MetricCard";
import { RevenueChart } from "@/components/analytics/RevenueChart";
import { PaymentMethodsChart } from "@/components/analytics/PaymentMethodsChart";
import { GeographicChart } from "@/components/analytics/GeographicChart";
import { ForecastChart } from "@/components/analytics/ForecastChart";
import { CustomerAnalytics } from "@/components/analytics/CustomerAnalytics";
import { ConversionFunnel } from "@/components/analytics/ConversionFunnel";
import { ReportBuilder } from "@/components/analytics/ReportBuilder";
import { AnomalyAlerts } from "@/components/analytics/AnomalyAlerts";

type TimeRange = "24h" | "7d" | "30d" | "90d" | "custom";

interface AnalyticsData {
  cards: Array<{
    name: string;
    value: number;
    change: number;
    changePeriod: string;
    trend: "up" | "down" | "neutral";
  }>;
  revenue: {
    total: number;
    growth: number;
    data: Array<{ date: string; value: number }>;
  };
  paymentMethods: Array<{
    method: string;
    count: number;
    percentage: number;
    amount: number;
  }>;
  geographic: Array<{
    country: string;
    count: number;
    amount: number;
  }>;
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "forecast" | "customers" | "alerts" | "reports">("overview");

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Replace with actual API call
      // const response = await fetch(`/api/analytics/metrics?timeRange=${timeRange}`);
      // const data = await response.json();
      
      // Mock data for now
      const mockData: AnalyticsData = {
        cards: [
          {
            name: "Revenue",
            value: 45230.50,
            change: 12.5,
            changePeriod: "last period",
            trend: "up",
          },
          {
            name: "Transaction Volume",
            value: 1234,
            change: 8.3,
            changePeriod: "last period",
            trend: "up",
          },
          {
            name: "Success Rate",
            value: 94.5,
            change: -2.1,
            changePeriod: "last period",
            trend: "down",
          },
          {
            name: "Average Order Value",
            value: 36.67,
            change: 4.2,
            changePeriod: "last period",
            trend: "up",
          },
        ],
        revenue: {
          total: 45230.50,
          growth: 12.5,
          data: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString(),
            value: 4000 + Math.random() * 3000,
          })),
        },
        paymentMethods: [
          { method: "USDC", count: 456, percentage: 45, amount: 25000 },
          { method: "ETH", count: 312, percentage: 31, amount: 15000 },
          { method: "BTC", count: 156, percentage: 15, amount: 8000 },
          { method: "Card", count: 89, percentage: 9, amount: 5000 },
        ],
        geographic: [
          { country: "United States", count: 523, amount: 28000 },
          { country: "United Kingdom", count: 234, amount: 12000 },
          { country: "Germany", count: 189, amount: 9500 },
          { country: "France", count: 145, amount: 7200 },
          { country: "Canada", count: 98, amount: 4900 },
        ],
      };
      
      setData(mockData);
    } catch (error) {
      console.error("Failed to fetch analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "forecast", label: "Forecast", icon: LineChart },
    { id: "customers", label: "Customers", icon: Users },
    { id: "alerts", label: "Alerts", icon: AlertTriangle },
    { id: "reports", label: "Reports", icon: Download },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Advanced Analytics
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Real-time insights and business intelligence
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            {(["24h", "7d", "30d", "90d"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  timeRange === range
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <button
            onClick={fetchAnalyticsData}
            className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 text-zinc-600 dark:text-zinc-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === "overview" && data && (
            <div className="space-y-6">
              {/* Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.cards.map((card, index) => (
                  <MetricCard key={index} {...card} />
                ))}
              </div>

              {/* Revenue Chart */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      Revenue Over Time
                    </h3>
                    <p className="text-sm text-zinc-500">
                      Total: ${data.revenue.total.toLocaleString()} ({data.revenue.growth > 0 ? "+" : ""}{data.revenue.growth}%)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="flex items-center gap-1 text-zinc-500">
                      <Calendar className="w-4 h-4" />
                      {timeRange}
                    </span>
                  </div>
                </div>
                <RevenueChart data={data.revenue.data} />
              </div>

              {/* Payment Methods and Geographic */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2 mb-6">
                    <PieChart className="w-5 h-5 text-zinc-500" />
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      Payment Methods
                    </h3>
                  </div>
                  <PaymentMethodsChart data={data.paymentMethods} />
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2 mb-6">
                    <Map className="w-5 h-5 text-zinc-500" />
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      Geographic Distribution
                    </h3>
                  </div>
                  <GeographicChart data={data.geographic} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "forecast" && (
            <div className="space-y-6">
              <ForecastChart />
            </div>
          )}

          {activeTab === "customers" && (
            <div className="space-y-6">
              <CustomerAnalytics />
              <ConversionFunnel />
            </div>
          )}

          {activeTab === "alerts" && (
            <AnomalyAlerts />
          )}

          {activeTab === "reports" && (
            <ReportBuilder />
          )}
        </>
      )}
    </div>
  );
}
