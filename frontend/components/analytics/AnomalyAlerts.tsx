"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, Activity, Filter, RefreshCw } from "lucide-react";

type AnomalySeverity = "low" | "medium" | "high" | "critical";
type AnomalyStatus = "open" | "acknowledged" | "resolved" | "false_positive";
type AnomalyType = "revenue_spike" | "revenue_drop" | "success_rate_drop" | "unusual_volume" | "geographic_anomaly" | "payment_method_anomaly" | "fraud_pattern";

interface AnomalyAlert {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  description: string;
  metadata: {
    metricName: string;
    expectedValue: number;
    actualValue: number;
    deviation: number;
    threshold: number;
    timestamp: string;
  };
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export function AnomalyAlerts() {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ status?: AnomalyStatus; severity?: AnomalySeverity }>({});

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      // Replace with actual API call
      // const params = new URLSearchParams(filter as any);
      // const response = await fetch(`/api/analytics/anomalies?${params}`);
      // const data = await response.json();
      
      // Mock data
      const mockAlerts: AnomalyAlert[] = [
        {
          id: "1",
          type: "revenue_drop",
          severity: "high",
          status: "open",
          description: "Revenue decrease of 35.5% detected. Current: 3200.00, Expected: 4950.00",
          metadata: {
            metricName: "revenue",
            expectedValue: 4950,
            actualValue: 3200,
            deviation: -35.5,
            threshold: 30,
            timestamp: new Date().toISOString(),
          },
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "2",
          type: "success_rate_drop",
          severity: "high",
          status: "acknowledged",
          description: "Success Rate decrease of 18.2% detected. Current: 76.5, Expected: 93.5",
          metadata: {
            metricName: "success_rate",
            expectedValue: 93.5,
            actualValue: 76.5,
            deviation: -18.2,
            threshold: 15,
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          },
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          acknowledgedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "3",
          type: "unusual_volume",
          severity: "medium",
          status: "resolved",
          description: "Transaction Volume increase of 45.0% detected. Current: 234, Expected: 161",
          metadata: {
            metricName: "transaction_volume",
            expectedValue: 161,
            actualValue: 234,
            deviation: 45,
            threshold: 40,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          resolvedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        },
      ];
      
      setAlerts(mockAlerts);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      // await fetch(`/api/analytics/anomalies/${alertId}/acknowledge`, { method: 'POST' });
      setAlerts(alerts.map(a => 
        a.id === alertId 
          ? { ...a, status: "acknowledged" as AnomalyStatus, acknowledgedAt: new Date().toISOString() }
          : a
      ));
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
    }
  };

  const handleResolve = async (alertId: string, notes: string) => {
    try {
      // await fetch(`/api/analytics/anomalies/${alertId}/resolve`, { 
      //   method: 'POST',
      //   body: JSON.stringify({ notes }),
      // });
      setAlerts(alerts.map(a => 
        a.id === alertId 
          ? { ...a, status: "resolved" as AnomalyStatus, resolvedAt: new Date().toISOString() }
          : a
      ));
    } catch (error) {
      console.error("Failed to resolve alert:", error);
    }
  };

  const handleFalsePositive = async (alertId: string) => {
    try {
      // await fetch(`/api/analytics/anomalies/${alertId}/false-positive`, { method: 'POST' });
      setAlerts(alerts.map(a => 
        a.id === alertId 
          ? { ...a, status: "false_positive" as AnomalyStatus, resolvedAt: new Date().toISOString() }
          : a
      ));
    } catch (error) {
      console.error("Failed to mark as false positive:", error);
    }
  };

  const getSeverityColor = (severity: AnomalySeverity) => {
    const colors = {
      low: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      medium: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
      high: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
      critical: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    };
    return colors[severity];
  };

  const getStatusIcon = (status: AnomalyStatus) => {
    const icons = {
      open: AlertTriangle,
      acknowledged: Clock,
      resolved: CheckCircle,
      false_positive: XCircle,
    };
    return icons[status];
  };

  const getTypeIcon = (type: AnomalyType) => {
    if (type.includes("revenue")) return type === "revenue_spike" ? TrendingUp : TrendingDown;
    if (type === "success_rate_drop") return Activity;
    return AlertTriangle;
  };

  const stats = {
    total: alerts.length,
    open: alerts.filter(a => a.status === "open").length,
    acknowledged: alerts.filter(a => a.status === "acknowledged").length,
    resolved: alerts.filter(a => a.status === "resolved" || a.status === "false_positive").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Anomaly Detection & Alerts
          </h3>
          <p className="text-sm text-zinc-500">
            Real-time anomaly detection and alert management
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
          <div className="text-sm text-zinc-500 mb-1">Total Alerts</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{stats.total}</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800">
          <div className="text-sm text-red-600 dark:text-red-400 mb-1">Open</div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.open}</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-6 border border-yellow-200 dark:border-yellow-800">
          <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">Acknowledged</div>
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.acknowledged}</div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800">
          <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">Resolved</div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.resolved}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Filter:</span>
        </div>
        <select
          value={filter.status || "all"}
          onChange={(e) => setFilter({ ...filter, status: e.target.value === "all" ? undefined : e.target.value as AnomalyStatus })}
          className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-50 border-0"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
          <option value="false_positive">False Positive</option>
        </select>
        <select
          value={filter.severity || "all"}
          onChange={(e) => setFilter({ ...filter, severity: e.target.value === "all" ? undefined : e.target.value as AnomalySeverity })}
          className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-50 border-0"
        >
          <option value="all">All Severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 border border-zinc-200 dark:border-zinc-800 text-center">
            <AlertTriangle className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-500">No anomalies detected</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const StatusIcon = getStatusIcon(alert.status);
            const TypeIcon = getTypeIcon(alert.type);
            
            return (
              <div
                key={alert.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${getSeverityColor(alert.severity)}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {new Date(alert.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-zinc-900 dark:text-zinc-50 font-medium mb-2">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-zinc-500">
                        <span>Expected: {alert.metadata.expectedValue.toFixed(2)}</span>
                        <span>Actual: {alert.metadata.actualValue.toFixed(2)}</span>
                        <span className={alert.metadata.deviation > 0 ? "text-emerald-600" : "text-red-600"}>
                          {alert.metadata.deviation > 0 ? "+" : ""}{alert.metadata.deviation.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      alert.status === "open" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
                      alert.status === "acknowledged" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400" :
                      "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                    }`}>
                      <StatusIcon className="w-3 h-3" />
                      {alert.status.replace("_", " ").toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {alert.status === "open" && (
                  <div className="flex items-center gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm font-medium hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => handleResolve(alert.id, "Investigated and resolved")}
                      className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => handleFalsePositive(alert.id)}
                      className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      False Positive
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
