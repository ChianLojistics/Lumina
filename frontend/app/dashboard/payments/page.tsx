"use client";

import { useState } from "react";
import { PaymentTable } from "@/components/dashboard/PaymentTable";
import type { PaymentStatus } from "@/components/dashboard/PaymentTable";
import { X, ExternalLink } from "lucide-react";

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
  {
    id: "pay_1234567895",
    amount: 890.00,
    currency: "USDC",
    status: "expired" as PaymentStatus,
    customerEmail: "customer6@example.com",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    description: "Pro plan",
  },
  {
    id: "pay_1234567896",
    amount: 1200.00,
    currency: "USDC",
    status: "confirmed" as PaymentStatus,
    customerEmail: "customer7@example.com",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    description: "Team plan",
  },
  {
    id: "pay_1234567897",
    amount: 450.00,
    currency: "USDC",
    status: "pending" as PaymentStatus,
    customerEmail: "customer8@example.com",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    description: "Monthly subscription",
  },
];

export default function PaymentsPage() {
  const [selectedPayment, setSelectedPayment] = useState<typeof mockPayments[0] | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Payment History
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          View and manage all your payment transactions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <div className="text-sm text-zinc-500 mb-1">Total Volume</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            ${mockPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <div className="text-sm text-zinc-500 mb-1">Confirmed</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {mockPayments.filter(p => p.status === "confirmed").length}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <div className="text-sm text-zinc-500 mb-1">Pending</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {mockPayments.filter(p => p.status === "pending").length}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <div className="text-sm text-zinc-500 mb-1">Failed</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {mockPayments.filter(p => p.status === "failed").length}
          </div>
        </div>
      </div>

      {/* Payment Table */}
      <PaymentTable 
        payments={mockPayments} 
        onExport={() => console.log("Export triggered")}
      />

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-zinc-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Payment Details
              </h3>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-zinc-500 mb-1">Payment ID</div>
                  <div className="font-mono text-sm text-zinc-900 dark:text-zinc-50">
                    {selectedPayment.id}
                  </div>
                </div>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium capitalize ${
                  selectedPayment.status === "confirmed" 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : selectedPayment.status === "pending"
                    ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                    : selectedPayment.status === "failed"
                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                }`}>
                  {selectedPayment.status}
                </span>
              </div>

              <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                <div className="text-sm text-zinc-500 mb-1">Amount</div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  ${selectedPayment.amount.toLocaleString()} {selectedPayment.currency}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-zinc-500 mb-1">Customer Email</div>
                  <div className="text-sm text-zinc-900 dark:text-zinc-50">
                    {selectedPayment.customerEmail}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-zinc-500 mb-1">Description</div>
                  <div className="text-sm text-zinc-900 dark:text-zinc-50">
                    {selectedPayment.description || "N/A"}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-zinc-500 mb-1">Created At</div>
                  <div className="text-sm text-zinc-900 dark:text-zinc-50">
                    {new Date(selectedPayment.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors">
                <ExternalLink className="w-4 h-4" />
                View on Blockchain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
