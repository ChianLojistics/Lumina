"use client";

import { useState } from "react";
import {
  Webhook,
  Plus,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Filter,
  Send,
  Eye,
  EyeOff,
  Activity,
  Layers,
  ArrowRight,
} from "lucide-react";

interface WebhookItem {
  id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  filters?: {
    amount?: { min?: number; max?: number };
    currency?: string[];
    status?: string[];
  };
  headers?: Record<string, string>;
  created_at: string;
}

interface DeliveryLog {
  id: string;
  webhook_id: string;
  event_id: string;
  event: string;
  status: "success" | "retrying" | "failed" | "dlq";
  attempts: number;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  created_at: string;
}

interface DLQItem {
  id: string;
  webhook_id: string;
  event_id: string;
  event: string;
  error_message: string;
  attempts: number;
  failed_at: string;
}

export default function WebhooksPage() {
  const [activeTab, setActiveTab] = useState<"subscriptions" | "deliveries" | "dlq">("subscriptions");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookItem | null>(null);
  const [showSecretMap, setShowSecretMap] = useState<Record<string, boolean>>({});

  // Form State
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>(["payment.confirmed"]);
  const [formMinAmount, setFormMinAmount] = useState("");
  const [formMaxAmount, setFormMaxAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState("");

  // Test State
  const [testUrl, setTestUrl] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  // Mock initial state for preview & demonstration
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([
    {
      id: "wh_101",
      url: "https://api.merchant.com/v1/webhooks/lumina",
      events: ["payment.created", "payment.confirmed"],
      secret: "whsec_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d",
      is_active: true,
      filters: { amount: { min: 10, max: 5000 }, currency: ["USDC"] },
      headers: { "X-Custom-Header": "lumina-prod" },
      created_at: "2026-08-15 14:20",
    },
    {
      id: "wh_102",
      url: "https://hooks.zapier.com/hooks/catch/12345/lumina",
      events: ["payment.failed", "subscription.billed"],
      secret: "whsec_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
      is_active: false,
      created_at: "2026-08-16 09:10",
    },
  ]);

  const [deliveries, setDeliveries] = useState<DeliveryLog[]>([
    {
      id: "del_801",
      webhook_id: "wh_101",
      event_id: "evt_991",
      event: "payment.confirmed",
      status: "success",
      attempts: 1,
      response_status: 200,
      response_body: '{"received": true}',
      error_message: null,
      created_at: "2026-08-18 20:15",
    },
    {
      id: "del_802",
      webhook_id: "wh_101",
      event_id: "evt_992",
      event: "payment.created",
      status: "retrying",
      attempts: 2,
      response_status: 503,
      response_body: "Service Unavailable",
      error_message: "Received status 503",
      created_at: "2026-08-18 20:25",
    },
  ]);

  const [dlqItems, setDlqItems] = useState<DLQItem[]>([
    {
      id: "dlq_401",
      webhook_id: "wh_102",
      event_id: "evt_771",
      event: "payment.failed",
      error_message: "Connection timed out after 5000ms (max attempts exhausted)",
      attempts: 5,
      failed_at: "2026-08-18 19:40",
    },
  ]);

  const availableEvents = [
    "payment.created",
    "payment.confirmed",
    "payment.failed",
    "escrow.created",
    "subscription.billed",
  ];

  const toggleWebhookStatus = (id: string) => {
    setWebhooks((prev) =>
      prev.map((w) => (w.id === id ? { ...w, is_active: !w.is_active } : w)),
    );
  };

  const deleteWebhook = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUrl) return;

    const newWebhook: WebhookItem = {
      id: `wh_${Date.now()}`,
      url: formUrl,
      events: formEvents,
      secret: Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join(""),
      is_active: true,
      filters:
        formMinAmount || formMaxAmount || formCurrency
          ? {
              amount: {
                min: formMinAmount ? Number(formMinAmount) : undefined,
                max: formMaxAmount ? Number(formMaxAmount) : undefined,
              },
              currency: formCurrency ? [formCurrency.toUpperCase()] : undefined,
            }
          : undefined,
      created_at: new Date().toISOString().replace("T", " ").slice(0, 16),
    };

    setWebhooks([newWebhook, ...webhooks]);
    setShowRegisterModal(false);
    setFormUrl("");
  };

  const handleRunTest = async () => {
    setTesting(true);
    setTestResult(null);

    setTimeout(() => {
      setTestResult({
        success: true,
        status: 200,
        latency_ms: 142,
        timestamp: Math.floor(Date.now() / 1000),
        signature: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        response_body: JSON.stringify({ status: "success", message: "Webhook received" }, null, 2),
      });
      setTesting(false);
    }, 800);
  };

  const retryDLQ = (dlqId: string) => {
    setDlqItems((prev) => prev.filter((d) => d.id !== dlqId));
    setDeliveries((prev) => [
      {
        id: `del_${Date.now()}`,
        webhook_id: "wh_101",
        event_id: `evt_retry_${Date.now()}`,
        event: "payment.failed",
        status: "success",
        attempts: 1,
        response_status: 200,
        response_body: '{"replayed": true}',
        error_message: null,
        created_at: new Date().toISOString().replace("T", " ").slice(0, 16),
      },
      ...prev,
    ]);
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Webhook className="w-7 h-7 text-emerald-500" />
            Webhook Subscriptions & Delivery Monitoring
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Enterprise delivery engine with intelligent retry, HMAC signatures, DLQ, and real-time monitoring.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setTestUrl(webhooks[0]?.url || "https://example.com/webhook");
              setShowTestModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium rounded-lg text-sm transition-colors"
          >
            <Send className="w-4 h-4" />
            Test Endpoint
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Webhook
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Webhooks</span>
            <Webhook className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">{webhooks.length}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            {webhooks.filter((w) => w.is_active).length} active, {webhooks.filter((w) => !w.is_active).length} paused
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Delivery Success</span>
            <Activity className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">99.4%</p>
          <p className="text-xs text-zinc-500 mt-1">Guaranteed at-least-once delivery</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pending Retries</span>
            <RefreshCw className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">
            {deliveries.filter((d) => d.status === "retrying").length}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Exponential backoff active</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Dead Letter Queue</span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">{dlqItems.length}</p>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">Manual replay available</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "subscriptions"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <Layers className="w-4 h-4" />
            Subscriptions ({webhooks.length})
          </button>
          <button
            onClick={() => setActiveTab("deliveries")}
            className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "deliveries"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <Clock className="w-4 h-4" />
            Delivery History ({deliveries.length})
          </button>
          <button
            onClick={() => setActiveTab("dlq")}
            className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "dlq"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            Dead Letter Queue ({dlqItems.length})
          </button>
        </nav>
      </div>

      {/* TAB 1: SUBSCRIPTIONS */}
      {activeTab === "subscriptions" && (
        <div className="space-y-4">
          {webhooks.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      item.is_active
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.is_active ? "bg-emerald-500" : "bg-zinc-400"
                      }`}
                    />
                    {item.is_active ? "Active" : "Paused"}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">{item.id}</span>
                </div>

                <div className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50 break-all">
                  {item.url}
                </div>

                {/* Subscribed Events */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-zinc-400 font-medium">Events:</span>
                  {item.events.map((evt) => (
                    <span
                      key={evt}
                      className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded font-mono text-xs"
                    >
                      {evt}
                    </span>
                  ))}
                </div>

                {/* Filter info */}
                {item.filters && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <Filter className="w-3.5 h-3.5 text-emerald-500" />
                    <span>
                      Filter:{" "}
                      {item.filters.amount?.min && `min $${item.filters.amount.min} `}
                      {item.filters.amount?.max && `max $${item.filters.amount.max} `}
                      {item.filters.currency && `[${item.filters.currency.join(", ")}]`}
                    </span>
                  </div>
                )}

                {/* Secret Key Display */}
                <div className="flex items-center gap-2 pt-1">
                  <Shield className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-400">HMAC Secret:</span>
                  <span className="font-mono text-xs text-zinc-500">
                    {showSecretMap[item.id] ? item.secret : "••••••••••••••••••••••••••••••••"}
                  </span>
                  <button
                    onClick={() =>
                      setShowSecretMap((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                    }
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                  >
                    {showSecretMap[item.id] ? (
                      <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 self-end lg:self-center">
                <button
                  onClick={() => {
                    setTestUrl(item.url);
                    setSelectedWebhook(item);
                    setShowTestModal(true);
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Test
                </button>

                <button
                  onClick={() => toggleWebhookStatus(item.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                    item.is_active
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                  }`}
                >
                  {item.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {item.is_active ? "Pause" : "Resume"}
                </button>

                <button
                  onClick={() => deleteWebhook(item.id)}
                  className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Delete Webhook"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: DELIVERY LOGS */}
      {activeTab === "deliveries" && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Event</th>
                  <th className="px-6 py-3.5">Event ID</th>
                  <th className="px-6 py-3.5">Attempts</th>
                  <th className="px-6 py-3.5">Response</th>
                  <th className="px-6 py-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {deliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="px-6 py-4">
                      {del.status === "success" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 200 OK
                        </span>
                      )}
                      {del.status === "retrying" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Retrying
                        </span>
                      )}
                      {del.status === "failed" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {del.event}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-500">{del.event_id}</td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{del.attempts} / 5</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                        {del.response_body || del.error_message || "No body"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">{del.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DEAD LETTER QUEUE (DLQ) */}
      {activeTab === "dlq" && (
        <div className="space-y-4">
          {dlqItems.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">DLQ is Empty</h3>
              <p className="text-sm text-zinc-500 mt-1">All webhooks delivered successfully without dead-letter failures.</p>
            </div>
          ) : (
            dlqItems.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-950 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> DLQ Exhausted
                    </span>
                    <span className="text-xs font-mono text-zinc-400">{item.id}</span>
                  </div>
                  <div className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Event: {item.event} ({item.event_id})
                  </div>
                  <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/5 p-2 rounded border border-rose-500/10 font-mono">
                    Failure Cause: {item.error_message}
                  </p>
                  <p className="text-xs text-zinc-500">Failed at: {item.failed_at} | Attempts: {item.attempts}</p>
                </div>

                <button
                  onClick={() => retryDLQ(item.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg flex items-center gap-2 transition-colors self-start md:self-center"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Manual Replay
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* REGISTER WEBHOOK MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-500" />
              Register New Webhook Endpoint
            </h2>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                  Endpoint URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://api.yourdomain.com/webhooks"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-2">
                  Subscribed Events
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableEvents.map((evt) => (
                    <label key={evt} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={formEvents.includes(evt)}
                        onChange={(e) => {
                          if (e.target.checked) setFormEvents([...formEvents, evt]);
                          else setFormEvents(formEvents.filter((item) => item !== evt));
                        }}
                        className="accent-emerald-500 rounded"
                      />
                      {evt}
                    </label>
                  ))}
                </div>
              </div>

              {/* Event Filters */}
              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-emerald-500" /> Rule-based Filters (Optional)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Min Amount ($)</label>
                    <input
                      type="number"
                      placeholder="e.g. 10"
                      value={formMinAmount}
                      onChange={(e) => setFormMinAmount(e.target.value)}
                      className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Max Amount ($)</label>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      value={formMaxAmount}
                      onChange={(e) => setFormMaxAmount(e.target.value)}
                      className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg"
                >
                  Save Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEST WEBHOOK MODAL */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-500" />
              Webhook Endpoint Tester
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                  Target Endpoint URL
                </label>
                <input
                  type="url"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-mono"
                />
              </div>

              <button
                onClick={handleRunTest}
                disabled={testing}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-lg flex items-center justify-center gap-2"
              >
                {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {testing ? "Sending Ping..." : "Send Test Ping Payload"}
              </button>

              {testResult && (
                <div className="space-y-3 bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-xs font-mono text-zinc-200">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold">Status: {testResult.status} OK</span>
                    <span className="text-zinc-500">Latency: {testResult.latency_ms}ms</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-1">x-lumina-signature Header:</span>
                    <span className="text-amber-400 break-all">{testResult.signature}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-1">Response Body:</span>
                    <pre className="text-zinc-300 bg-zinc-900 p-2 rounded overflow-x-auto">
                      {testResult.response_body}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
