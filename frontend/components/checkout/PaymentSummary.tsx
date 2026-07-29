'use client';

import React from 'react';
import { DollarSign, Building2, Clock } from 'lucide-react';

interface PaymentSummaryProps {
  amount: number;
  currency: string;
  merchantName: string;
  merchantLogo?: string;
  expiresAt: Date;
  description?: string;
}

export default function PaymentSummary({
  amount,
  currency,
  merchantName,
  merchantLogo,
  expiresAt,
  description,
}: PaymentSummaryProps) {
  const formatAmount = (value: number, curr: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
    }).format(value);
  };

  const formatTimeRemaining = (expiry: Date) => {
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const [timeRemaining, setTimeRemaining] = React.useState(
    formatTimeRemaining(expiresAt)
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(expiresAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {merchantLogo ? (
            <img
              src={merchantLogo}
              alt={merchantName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{merchantName}</h3>
            <p className="text-sm text-gray-500">Secure Payment</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">{timeRemaining}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Amount to Pay</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatAmount(amount, currency)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Currency</p>
            <p className="font-semibold text-gray-900">{currency}</p>
          </div>
        </div>

        {description && (
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-1">Description</p>
            <p className="text-gray-900">{description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
