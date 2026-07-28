'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PaymentSummary from '@/components/checkout/PaymentSummary';
import CryptoSelector, { CryptoCurrency } from '@/components/checkout/CryptoSelector';
import WalletConnector from '@/components/checkout/WalletConnector';
import QRCode from '@/components/checkout/QRCode';
import StatusIndicator, { PaymentStatus } from '@/components/checkout/StatusIndicator';

interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  merchantName: string;
  merchantLogo?: string;
  expiresAt: Date;
  description?: string;
  status: PaymentStatus;
  transactionHash?: string;
  supportedCurrencies: CryptoCurrency[];
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.id as string;

  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('XLM');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  // Mock payment data - replace with actual API call
  const mockPaymentData: PaymentData = {
    id: paymentId,
    amount: 100,
    currency: 'USD',
    merchantName: 'Example Store',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
    description: 'Payment for order #12345',
    status: 'pending',
    supportedCurrencies: [
      {
        symbol: 'XLM',
        name: 'Stellar Lumens',
        network: 'Stellar',
        icon: '⟠',
        address: 'GD5J6JFZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZ',
        estimatedValue: 450.5,
      },
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        network: 'Bitcoin',
        icon: '₿',
        address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        estimatedValue: 0.0015,
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        network: 'Ethereum',
        icon: 'Ξ',
        address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        estimatedValue: 0.03,
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        network: 'Stellar',
        icon: '$',
        address: 'GD5J6JFZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZ',
        estimatedValue: 100,
      },
      {
        symbol: 'USDT',
        name: 'Tether',
        network: 'Tron',
        icon: '₮',
        address: 'TJ9kY1zJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZJZ',
        estimatedValue: 100,
      },
    ],
  };

  useEffect(() => {
    // Simulate API call to fetch payment data
    const fetchPaymentData = async () => {
      try {
        // Replace with actual API call:
        // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/${paymentId}`);
        // const data = await response.json();
        // setPaymentData(data);
        
        setPaymentData(mockPaymentData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch payment data:', error);
        setLoading(false);
      }
    };

    fetchPaymentData();
  }, [paymentId]);

  // Poll for payment status updates
  useEffect(() => {
    if (!paymentData || paymentData.status === 'completed' || paymentData.status === 'failed' || paymentData.status === 'expired') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        // Replace with actual API call:
        // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/${paymentId}/status`);
        // const data = await response.json();
        // setPaymentData(prev => ({ ...prev, status: data.status, transactionHash: data.transactionHash }));
        
        // Mock status update for demo
        // In production, this would come from the API
      } catch (error) {
        console.error('Failed to poll payment status:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [paymentData, paymentId]);

  // Redirect based on payment status
  useEffect(() => {
    if (!paymentData) return;

    if (paymentData.status === 'completed') {
      router.push(`/checkout/success?id=${paymentId}`);
    } else if (paymentData.status === 'failed') {
      router.push(`/checkout/failed?id=${paymentId}`);
    } else if (paymentData.status === 'expired') {
      router.push(`/checkout/expired?id=${paymentId}`);
    }
  }, [paymentData, router, paymentId]);

  const handleWalletConnect = () => {
    // Implement wallet connection logic
    // This would integrate with MetaMask, StellarTerm, etc.
    setIsConnected(true);
    setConnectionError(undefined);
  };

  const handleCurrencySelect = (symbol: string) => {
    setSelectedCurrency(symbol);
  };

  const selectedCurrencyData = paymentData?.supportedCurrencies.find(
    (c) => c.symbol === selectedCurrency
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Payment not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Secure Checkout</h1>
          <p className="text-gray-600">Complete your payment using cryptocurrency</p>
        </div>

        {/* Payment Status */}
        <StatusIndicator
          status={paymentData.status}
          transactionHash={paymentData.transactionHash}
          blockExplorerUrl="https://stellar.expert"
        />

        {/* Payment Summary */}
        <PaymentSummary
          amount={paymentData.amount}
          currency={paymentData.currency}
          merchantName={paymentData.merchantName}
          merchantLogo={paymentData.merchantLogo}
          expiresAt={paymentData.expiresAt}
          description={paymentData.description}
        />

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Crypto Selector */}
            <CryptoSelector
              currencies={paymentData.supportedCurrencies}
              selectedCurrency={selectedCurrency}
              onSelect={handleCurrencySelect}
              amount={paymentData.amount}
              baseCurrency={paymentData.currency}
            />

            {/* Wallet Connector */}
            {selectedCurrencyData && (
              <WalletConnector
                walletAddress={selectedCurrencyData.address}
                currency={selectedCurrency}
                onConnect={handleWalletConnect}
                isConnected={isConnected}
                connectionError={connectionError}
              />
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* QR Code */}
            {selectedCurrencyData && (
              <QRCode
                value={`${selectedCurrencyData.address}?amount=${selectedCurrencyData.estimatedValue || paymentData.amount}`}
                title={`Scan to pay with ${selectedCurrency}`}
              />
            )}

            {/* Payment Instructions */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                How to Pay
              </h3>
              <ol className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-xs">1</span>
                  <span>Select your preferred cryptocurrency above</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-xs">2</span>
                  <span>Connect your wallet or scan the QR code</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-xs">3</span>
                  <span>Confirm the transaction in your wallet</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-xs">4</span>
                  <span>Wait for blockchain confirmation (usually 1-3 minutes)</span>
                </li>
              </ol>
            </div>
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
