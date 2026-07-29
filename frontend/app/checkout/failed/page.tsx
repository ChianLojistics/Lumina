'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { XCircle, Home, RefreshCw, AlertTriangle } from 'lucide-react';

interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  merchantName: string;
  errorMessage?: string;
  timestamp: Date;
}

export default function FailedPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.id as string;

  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        // Replace with actual API call:
        // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/${paymentId}`);
        // const data = await response.json();
        // setPaymentData(data);
        
        // Mock data
        setPaymentData({
          id: paymentId,
          amount: 100,
          currency: 'USD',
          merchantName: 'Example Store',
          errorMessage: 'Transaction was rejected by the network',
          timestamp: new Date(),
        });
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch payment data:', error);
        setLoading(false);
      }
    };

    fetchPaymentData();
  }, [paymentId]);

  const handleRetry = () => {
    router.push(`/checkout/${paymentId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Failed Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-red-200">
          {/* Failed Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-16 h-16 text-red-600" />
            </div>
          </div>

          {/* Failed Message */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Failed</h1>
            <p className="text-gray-600">Your payment could not be processed.</p>
          </div>

          {/* Error Details */}
          {paymentData && (
            <div className="space-y-4 mb-8">
              {paymentData.errorMessage && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">Error Details</p>
                      <p className="text-sm text-red-700 mt-1">{paymentData.errorMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payment ID</span>
                  <span className="font-mono text-sm text-gray-900">{paymentData.id}</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Amount</span>
                  <span className="font-semibold text-gray-900">
                    {paymentData.amount.toFixed(2)} {paymentData.currency}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Merchant</span>
                  <span className="font-semibold text-gray-900">{paymentData.merchantName}</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Timestamp</span>
                  <span className="text-sm text-gray-900">
                    {paymentData.timestamp.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Troubleshooting */}
          <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">Common Issues</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Insufficient funds in your wallet</li>
              <li>• Network congestion or high fees</li>
              <li>• Transaction rejected by wallet</li>
              <li>• Invalid wallet address</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              <Home className="w-5 h-5" />
              Return to Home
            </button>
          </div>
        </div>

        {/* Support */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <a href="mailto:support@lumina.io" className="text-blue-600 hover:text-blue-700">
              Contact Support
            </a>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>Secured by Lumina • Powered by Stellar</p>
        </div>
      </div>
    </div>
  );
}
