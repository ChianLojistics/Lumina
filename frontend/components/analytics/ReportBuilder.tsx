"use client";

import { useState } from "react";
import { Plus, Download, Trash2, Calendar, FileText, Clock, Send } from "lucide-react";

interface ReportConfig {
  name: string;
  metrics: string[];
  filters: Record<string, any>;
  groupBy: string[];
  timeRange: string;
}

interface SavedReport {
  id: string;
  name: string;
  config: ReportConfig;
  schedule?: {
    frequency: "daily" | "weekly" | "monthly";
    recipients: string[];
    format: "csv" | "pdf" | "email";
  };
  createdAt: string;
}

export function ReportBuilder() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([
    {
      id: "1",
      name: "Monthly Revenue Report",
      config: {
        name: "Monthly Revenue Report",
        metrics: ["revenue", "transaction_volume", "success_rate"],
        filters: {},
        groupBy: ["day"],
        timeRange: "30d",
      },
      schedule: {
        frequency: "monthly",
        recipients: ["finance@company.com"],
        format: "pdf",
      },
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]);

  const [newReport, setNewReport] = useState<Partial<ReportConfig>>({
    name: "",
    metrics: [],
    filters: {},
    groupBy: [],
    timeRange: "7d",
  });

  const availableMetrics = [
    { id: "revenue", label: "Revenue" },
    { id: "transaction_volume", label: "Transaction Volume" },
    { id: "success_rate", label: "Success Rate" },
    { id: "avg_order_value", label: "Average Order Value" },
    { id: "refund_rate", label: "Refund Rate" },
    { id: "active_customers", label: "Active Customers" },
  ];

  const groupByOptions = [
    { id: "day", label: "Day" },
    { id: "week", label: "Week" },
    { id: "month", label: "Month" },
    { id: "payment_method", label: "Payment Method" },
    { id: "country", label: "Country" },
  ];

  const timeRangeOptions = [
    { id: "24h", label: "Last 24 Hours" },
    { id: "7d", label: "Last 7 Days" },
    { id: "30d", label: "Last 30 Days" },
    { id: "90d", label: "Last 90 Days" },
  ];

  const toggleMetric = (metricId: string) => {
    setNewReport(prev => ({
      ...prev,
      metrics: prev.metrics?.includes(metricId)
        ? prev.metrics.filter(m => m !== metricId)
        : [...(prev.metrics || []), metricId],
    }));
  };

  const toggleGroupBy = (groupBy: string) => {
    setNewReport(prev => ({
      ...prev,
      groupBy: prev.groupBy?.includes(groupBy)
        ? prev.groupBy.filter(g => g !== groupBy)
        : [...(prev.groupBy || []), groupBy],
    }));
  };

  const handleSaveReport = () => {
    if (!newReport.name || newReport.metrics.length === 0) return;

    const report: SavedReport = {
      id: Date.now().toString(),
      name: newReport.name,
      config: newReport as ReportConfig,
      createdAt: new Date().toISOString(),
    };

    setSavedReports(prev => [report, ...prev]);
    setNewReport({
      name: "",
      metrics: [],
      filters: {},
      groupBy: [],
      timeRange: "7d",
    });
    setShowBuilder(false);
  };

  const handleDeleteReport = (reportId: string) => {
    setSavedReports(prev => prev.filter(r => r.id !== reportId));
  };

  const handleExport = (reportId: string, format: "csv" | "pdf" | "json") => {
    console.log(`Exporting report ${reportId} as ${format}`);
    // Implement export logic
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Custom Reports
          </h3>
          <p className="text-sm text-zinc-500">
            Build and schedule custom analytics reports
          </p>
        </div>
        <button
          onClick={() => setShowBuilder(!showBuilder)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Report
        </button>
      </div>

      {/* Report Builder */}
      {showBuilder && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
          <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
            Build Custom Report
          </h4>

          <div className="space-y-6">
            {/* Report Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Report Name
              </label>
              <input
                type="text"
                value={newReport.name}
                onChange={(e) => setNewReport(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Weekly Performance Report"
                className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-50 border-0 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Metrics Selection */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Select Metrics
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableMetrics.map((metric) => (
                  <button
                    key={metric.id}
                    onClick={() => toggleMetric(metric.id)}
                    className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                      newReport.metrics?.includes(metric.id)
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {metric.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Range */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Time Range
              </label>
              <select
                value={newReport.timeRange}
                onChange={(e) => setNewReport(prev => ({ ...prev, timeRange: e.target.value }))}
                className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-50 border-0 focus:ring-2 focus:ring-emerald-500"
              >
                {timeRangeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Group By */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Group By
              </label>
              <div className="flex flex-wrap gap-2">
                {groupByOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => toggleGroupBy(option.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      newReport.groupBy?.includes(option.id)
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-500"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setShowBuilder(false)}
                className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReport}
                disabled={!newReport.name || newReport.metrics.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
              >
                Save Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Reports */}
      <div className="space-y-4">
        {savedReports.map((report) => (
          <div
            key={report.id}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                    {report.name}
                  </h4>
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                    {report.schedule && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {report.schedule.frequency}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {report.config.metrics.map((metric) => (
                      <span
                        key={metric}
                        className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs text-zinc-600 dark:text-zinc-400"
                      >
                        {metric}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleExport(report.id, "csv")}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Export as CSV"
                  >
                    <Download className="w-4 h-4 text-zinc-500" />
                  </button>
                  <button
                    onClick={() => handleExport(report.id, "pdf")}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Export as PDF"
                  >
                    <Download className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>
                <button
                  onClick={() => handleDeleteReport(report.id)}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Delete report"
                >
                  <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
