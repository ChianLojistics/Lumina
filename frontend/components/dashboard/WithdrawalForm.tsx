"use client";

import { useState } from "react";
import { Wallet, AlertCircle, CheckCircle } from "lucide-react";

interface WithdrawalFormProps {
  balance: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  onSubmit: (data: { amount: number; bankAccount: string; accountName: string }) => void;
}

export function WithdrawalForm({ balance, minWithdrawal, maxWithdrawal, onSubmit }: WithdrawalFormProps) {
  const [amount, setAmount] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [errors, setErrors] = useState<{ amount?: string; bankAccount?: string; accountName?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const newErrors: typeof errors = {};
    const amountNum = parseFloat(amount);

    if (!amount || isNaN(amountNum)) {
      newErrors.amount = "Please enter a valid amount";
    } else if (amountNum < minWithdrawal) {
      newErrors.amount = `Minimum withdrawal is $${minWithdrawal}`;
    } else if (amountNum > maxWithdrawal) {
      newErrors.amount = `Maximum withdrawal is $${maxWithdrawal}`;
    } else if (amountNum > balance) {
      newErrors.amount = "Insufficient balance";
    }

    if (!bankAccount.trim()) {
      newErrors.bankAccount = "Bank account is required";
    } else if (bankAccount.length < 8) {
      newErrors.bankAccount = "Invalid bank account number";
    }

    if (!accountName.trim()) {
      newErrors.accountName = "Account name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        amount: parseFloat(amount),
        bankAccount: bankAccount.trim(),
        accountName: accountName.trim(),
      });
      setSuccess(true);
      setAmount("");
      setBankAccount("");
      setAccountName("");
    } catch (error) {
      console.error("Withdrawal failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountNum >= minWithdrawal && amountNum <= maxWithdrawal && amountNum <= balance;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-500/10 rounded-lg">
          <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Request Withdrawal</h3>
          <p className="text-sm text-zinc-500">Available: ${balance.toLocaleString()} USDC</p>
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Withdrawal request submitted successfully
            </p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
              Your withdrawal is being processed
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Amount (USDC)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min={minWithdrawal}
              max={Math.min(maxWithdrawal, balance)}
              className={`w-full pl-8 pr-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 ${
                errors.amount ? "focus:ring-red-500" : "focus:ring-emerald-500"
              }`}
            />
          </div>
          {errors.amount && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.amount}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAmount(Math.min(balance, maxWithdrawal).toString())}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
          >
            Max
          </button>
          <button
            type="button"
            onClick={() => setAmount((balance * 0.5).toString())}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
          >
            Half
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Bank Account Number
          </label>
          <input
            type="text"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            placeholder="Enter your bank account number"
            className={`w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg focus:outline-none focus:ring-2 ${
              errors.bankAccount ? "focus:ring-red-500" : "focus:ring-emerald-500"
            }`}
          />
          {errors.bankAccount && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.bankAccount}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Account Holder Name
          </label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Enter account holder name"
            className={`w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg focus:outline-none focus:ring-2 ${
              errors.accountName ? "focus:ring-red-500" : "focus:ring-emerald-500"
            }`}
          />
          {errors.accountName && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.accountName}
            </p>
          )}
        </div>

        <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Withdrawal amount</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              ${amountNum.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Processing fee</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-50">$0.00</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-zinc-300 dark:border-zinc-700">
            <span className="font-medium text-zinc-900 dark:text-zinc-50">You will receive</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              ${amountNum.toLocaleString()}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isValidAmount}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {isSubmitting ? "Processing..." : "Request Withdrawal"}
        </button>

        <div className="text-center text-xs text-zinc-500">
          Min: ${minWithdrawal} • Max: ${maxWithdrawal}
        </div>
      </form>
    </div>
  );
}
