'use client';

import React from 'react';
import { Wallet, Copy, CheckCircle, AlertCircle } from 'lucide-react';

interface WalletConnectorProps {
  walletAddress: string;
  currency: string;
  onConnect?: () => void;
  isConnected?: boolean;
  connectionError?: string;
}

export default function WalletConnector({
  walletAddress,
  currency,
  onConnect,
  isConnected = false,
  connectionError,
}: WalletConnectorProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Wallet Connection
      </h3>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">Send payment to this address:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-3 py-2 rounded-lg text-sm font-mono text-gray-900 border border-gray-200">
                {truncateAddress(walletAddress)}
              </code>
              <button
                onClick={handleCopy}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {onConnect && (
            <button
              onClick={onConnect}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </button>
          )}

          <div className="text-center">
            <p className="text-sm text-gray-500">Supported wallets:</p>
            <div className="flex justify-center gap-4 mt-2">
              <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">MetaMask</span>
              <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">StellarTerm</span>
              <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">WalletConnect</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Wallet Connected</p>
              <p className="text-sm text-green-700">{truncateAddress(walletAddress)}</p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-900">
              Please confirm the transaction in your wallet to complete the payment.
            </p>
          </div>
        </div>
      )}

      {connectionError && (
        <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-900">{connectionError}</p>
        </div>
      )}
    </div>
  );
}
