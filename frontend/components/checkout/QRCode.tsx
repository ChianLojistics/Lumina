'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, RefreshCw } from 'lucide-react';

interface QRCodeProps {
  value: string;
  size?: number;
  title?: string;
  onRefresh?: () => void;
}

export default function QRCode({
  value,
  size = 200,
  title = 'Scan to Pay',
  onRefresh,
}: QRCodeProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh QR Code"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>

      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-white rounded-xl border-2 border-gray-200">
          <QRCodeSVG
            value={value}
            size={size}
            level="H"
            includeMargin={false}
            className="rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <Smartphone className="w-5 h-5" />
          <p className="text-sm">Scan with your wallet app</p>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2">Supported wallets:</p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">MetaMask</span>
            <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">Trust Wallet</span>
            <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">StellarTerm</span>
            <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">Ledger</span>
          </div>
        </div>
      </div>
    </div>
  );
}
