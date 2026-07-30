"use client";

import { WithdrawalForm } from "@/components/dashboard/WithdrawalForm";
import { Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

type WithdrawalStatus = "pending" | "processing" | "completed" | "failed";

interface Withdrawal {
  id: string;
  amount: number;
  bankAccount: string;
  accountName: string;
  status: WithdrawalStatus;
  createdAt: string;
  completedAt?: string;
}

// Mock data - replace with actual API calls
const mockWithdrawals: Withdrawal[] = [
  {
    id: "wdr_1234567890",
    amount: 5000.00,
    bankAccount: "****4532",
    accountName: "John Doe",
    status: "completed",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: "wdr_1234567891",
    amount: 2500.00,
    bankAccount: "****7891",
    accountName: "John Doe",
    status: "processing",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "wdr_1234567892",
    amount: 1000.00,
    bankAccount: "****3456",
    accountName: "John Doe",
    status: "pending",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
];

const statusConfig = {
  pending: {
    icon: Clock,
    color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    label: "Pending",
  },
  processing: {
    icon: Loader2,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    label: "Processing",
  },
  completed: {
    icon: CheckCircle,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    label: "Completed",
  },
  failed: {
    icon: AlertCircle,
    color: "bg-red-500/10 text-red-600 dark:text-red-400",
    label: "Failed",
  },
};

export default function WithdrawalsPage() {
  const currentBalance = 15250.00;
  const minWithdrawal = 100;
  const maxWithdrawal = 100;

  const handleWithdrawalSubmit = async (data: { amount: number; bankAccount: string; accountName: string }) => {
    // Replace with actual API call
    console.log("Withdrawal submitted:", data);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Withdrawals
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Manage your withdrawals and transfer funds to your bank account
        </p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-emerald-100 mb-2">Available Balance</div>
            <div className="text-4xl font-bold mb-1">
              ${currentBalance.toLocaleString()}
            </div>
            <div className="text-emerald-200 text-sm">USDC</div>
          </div>
          <div className="text-right">
            <div className="text-emerald-100 text-sm mb-1">Withdrawal Limits</div>
            <div className="text-white font-medium">
              Min: ${minWithdrawal} • Max: ${maxWithdrawal.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Withdrawal Form */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Request Withdrawal
          </h2>
          <WithdrawalForm
            balance={currentBalance}
            minWithdrawal={minWithdrawal}
            maxWithdrawal={maxWithdrawal}
            onSubmit={handleWithdrawalSubmit}
          />
        </div>

        {/* Withdrawal History */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Withdrawal History
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {mockWithdrawals.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  No withdrawal history
                </div>
              ) : (
                mockWithdrawals.map((withdrawal) => {
                  const config = statusConfig[withdrawal.status];
                  const Icon = config.icon;
                  
                  return (
                    <div key={withdrawal.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${config.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium text-zinc-900 dark:text-zinc-50">
                              ${withdrawal.amount.toLocaleString()}
                            </div>
                            <div className="text-xs text-zinc-500 font-mono">
                              {withdrawal.id}
                            </div>
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-zinc-500 mb-1">Bank Account</div>
                          <div className="text-zinc-900 dark:text-zinc-50">
                            {withdrawal.bankAccount}
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-500 mb-1">Account Name</div>
                          <div className="text-zinc-900 dark:text-zinc-50">
                            {withdrawal.accountName}
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-500 mb-1">Requested</div>
                          <div className="text-zinc-900 dark:text-zinc-50">
                            {format(new Date(withdrawal.createdAt), "MMM dd, yyyy HH:mm")}
                          </div>
                        </div>
                        {withdrawal.completedAt && (
                          <div>
                            <div className="text-zinc-500 mb-1">Completed</div>
                            <div className="text-zinc-900 dark:text-zinc-50">
                              {format(new Date(withdrawal.completedAt), "MMM dd, yyyy HH:mm")}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="font-medium text-blue-600 dark:text-blue-400 mb-1">
              Withdrawal Processing Time
            </div>
            <p className="text-sm text-blue-600/80 dark:text-blue-400/80">
              Withdrawals are typically processed within 1-3 business days. You will receive a notification when your withdrawal is completed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
