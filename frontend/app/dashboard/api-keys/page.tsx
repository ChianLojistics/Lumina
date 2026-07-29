"use client";

import { useState } from "react";
import { Key, Plus, Copy, Trash2, Eye, EyeOff, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  lastUsed: string | null;
  createdAt: string;
}

// Mock data - replace with actual API calls
const mockApiKeys: ApiKey[] = [
  {
    id: "key_1234567890",
    name: "Production Key",
    key: "sk_live_1234567890abcdef",
    permissions: ["payments:create", "payments:read", "webhooks:manage"],
    lastUsed: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: "key_1234567891",
    name: "Test Key",
    key: "sk_test_1234567890abcdef",
    permissions: ["payments:create", "payments:read"],
    lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
];

const availablePermissions = [
  { id: "payments:create", label: "Create Payments" },
  { id: "payments:read", label: "Read Payments" },
  { id: "payments:refund", label: "Refund Payments" },
  { id: "webhooks:manage", label: "Manage Webhooks" },
  { id: "accounts:read", label: "Read Account Info" },
  { id: "withdrawals:create", label: "Create Withdrawals" },
];

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(mockApiKeys);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;

    const newKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: newKeyName,
      key: `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      permissions: newKeyPermissions,
      lastUsed: null,
      createdAt: new Date().toISOString(),
    };

    setApiKeys([newKey, ...apiKeys]);
    setCreatedKey(newKey.key);
    setNewKeyName("");
    setNewKeyPermissions([]);
    setShowCreateModal(false);
  };

  const handleDeleteKey = (keyId: string) => {
    if (confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      setApiKeys(apiKeys.filter((k) => k.id !== keyId));
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisibleKeys = new Set(visibleKeys);
    if (newVisibleKeys.has(keyId)) {
      newVisibleKeys.delete(keyId);
    } else {
      newVisibleKeys.add(keyId);
    }
    setVisibleKeys(newVisibleKeys);
  };

  const maskKey = (key: string) => {
    return key.substring(0, 8) + "•".repeat(key.length - 12) + key.substring(key.length - 4);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            API Keys
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Manage your API keys for integrating with Lumina
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
        <div className="flex gap-3">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <div className="font-medium text-yellow-600 dark:text-yellow-400 mb-1">
              Keep your API keys secure
            </div>
            <p className="text-sm text-yellow-600/80 dark:text-yellow-400/80">
              Never share your API keys publicly or commit them to version control. API keys provide full access to your account based on their permissions.
            </p>
          </div>
        </div>
      </div>

      {/* API Keys List */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {apiKeys.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              No API keys found. Create your first API key to get started.
            </div>
          ) : (
            apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <Key className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {apiKey.name}
                      </div>
                      <div className="text-xs text-zinc-500 font-mono mt-1">
                        {apiKey.id}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                      className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Show/Hide key"
                    >
                      {visibleKeys.has(apiKey.id) ? (
                        <EyeOff className="w-4 h-4 text-zinc-500" />
                      ) : (
                        <Eye className="w-4 h-4 text-zinc-500" />
                      )}
                    </button>
                    <button
                      onClick={() => handleCopyKey(apiKey.key)}
                      className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Copy key"
                    >
                      <Copy className="w-4 h-4 text-zinc-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteKey(apiKey.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete key"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 font-mono text-sm">
                    {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {apiKey.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs rounded-md"
                    >
                      {permission}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <div>
                    Created: {format(new Date(apiKey.createdAt), "MMM dd, yyyy")}
                  </div>
                  {apiKey.lastUsed && (
                    <div>
                      Last used: {format(new Date(apiKey.lastUsed), "MMM dd, yyyy HH:mm")}
                    </div>
                  )}
                  {!apiKey.lastUsed && (
                    <div className="text-zinc-400">Never used</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-zinc-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Create API Key
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production Key, Test Key"
                  className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  Permissions
                </label>
                <div className="space-y-2">
                  {availablePermissions.map((permission) => (
                    <label key={permission.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                      <input
                        type="checkbox"
                        checked={newKeyPermissions.includes(permission.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewKeyPermissions([...newKeyPermissions, permission.id]);
                          } else {
                            setNewKeyPermissions(newKeyPermissions.filter((p) => p !== permission.id));
                          }
                        }}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-zinc-900 dark:text-zinc-50">
                        {permission.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateKey}
                disabled={!newKeyName.trim() || newKeyPermissions.length === 0}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                Create API Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key Created Modal */}
      {createdKey && (
        <div className="fixed inset-0 bg-zinc-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                API Key Created Successfully
              </h3>
              <p className="text-sm text-zinc-500 mb-6">
                Copy this key now. You won't be able to see it again.
              </p>

              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 mb-4">
                <code className="text-sm font-mono break-all">{createdKey}</code>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleCopyKey(createdKey)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy Key
                </button>
                <button
                  onClick={() => setCreatedKey(null)}
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50 font-medium rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
