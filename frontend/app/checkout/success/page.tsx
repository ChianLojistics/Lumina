'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, Home, ExternalLink, Copy } from 'lucide-react';

interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  merchantName: string;
  transactionHash: string;
  blockExplorerUrl: string;
  timestamp: Date;
}

export default function SuccessPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.id as string;

  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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
          transactionHash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
          blockExplorerUrl: 'https://stellar.expert',
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

  const handleCopy = async () => {
    if (paymentData?.transactionHash) {
      try {
        await navigator.clipboard.writeText(paymentData.transactionHash);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-green-200">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600">Your payment has been confirmed and processed.</p>
          </div>

          {/* Payment Details */}
          {paymentData && (
            <div className="space-y-4 mb-8">
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
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Transaction Hash</span>
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono text-gray-900">
                    {truncateHash(paymentData.transactionHash)}
                  </code>
                  <a
                    href={`${paymentData.blockExplorerUrl}/tx/${paymentData.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View
                  </a>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payment ID</span>
                  <span className="font-mono text-sm text-gray-900">{paymentData.id}</span>
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

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all"
            >
              <Home className="w-5 h-5" />
              Return to Home
            </button>

            <button
              onClick={() => window.print()}
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              <Copy className="w-5 h-5" />
              Print Receipt
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>Secured by Lumina • Powered by Stellar</p>
        </div>
      </div>
    </div>
  );
}
