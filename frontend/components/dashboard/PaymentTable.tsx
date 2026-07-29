"use client";

import { useState } from "react";
import { Search, Download, ChevronDown, Filter } from "lucide-react";
import { format } from "date-fns";

export type PaymentStatus = "pending" | "confirmed" | "failed" | "expired";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  customerEmail: string;
  createdAt: string;
  description?: string;
}

interface PaymentTableProps {
  payments: Payment[];
  showSearch?: boolean;
  showFilter?: boolean;
  showExport?: boolean;
  onExport?: () => void;
}

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  confirmed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  failed: "bg-red-500/10 text-red-600 dark:text-red-400",
  expired: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

export function PaymentTable({ 
  payments, 
  showSearch = true, 
  showFilter = true,
  showExport = true,
  onExport 
}: PaymentTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [sortField, setSortField] = useState<"createdAt" | "amount">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredPayments = payments
    .filter((payment) => {
      const matchesSearch = 
        payment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (payment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      
      const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const modifier = sortOrder === "asc" ? 1 : -1;
      if (sortField === "createdAt") {
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * modifier;
      }
      return (a.amount - b.amount) * modifier;
    });

  const handleSort = (field: "createdAt" | "amount") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const exportToCSV = () => {
    const headers = ["ID", "Amount", "Currency", "Status", "Customer Email", "Created At", "Description"];
    const rows = filteredPayments.map(payment => [
      payment.id,
      payment.amount.toString(),
      payment.currency,
      payment.status,
      payment.customerEmail,
      payment.createdAt,
      payment.description || "",
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    onExport?.();
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      {(showSearch || showFilter || showExport) && (
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-4">
          {showSearch && (
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search payments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {showFilter && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | "all")}
                className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="failed">Failed</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          )}

          {showExport && (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                Payment ID
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-200"
                onClick={() => handleSort("amount")}
              >
                <div className="flex items-center gap-1">
                  Amount
                  <ChevronDown className={`w-3 h-3 transition-transform ${sortField === "amount" && sortOrder === "asc" ? "rotate-180" : ""}`} />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                Customer
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-200"
                onClick={() => handleSort("createdAt")}
              >
                <div className="flex items-center gap-1">
                  Date
                  <ChevronDown className={`w-3 h-3 transition-transform ${sortField === "createdAt" && sortOrder === "asc" ? "rotate-180" : ""}`} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                  No payments found
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {payment.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                    ${payment.amount.toLocaleString()} {payment.currency}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[payment.status]}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                    {payment.customerEmail}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                    {format(new Date(payment.createdAt), "MMM dd, yyyy HH:mm")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredPayments.length > 0 && (
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500">
          Showing {filteredPayments.length} of {payments.length} payments
        </div>
      )}
    </div>
  );
}
