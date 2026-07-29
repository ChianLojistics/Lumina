'use client';

import React from 'react';

export interface CryptoCurrency {
  symbol: string;
  name: string;
  network: string;
  icon: string;
  address: string;
  estimatedValue?: number;
}

interface CryptoSelectorProps {
  currencies: CryptoCurrency[];
  selectedCurrency: string;
  onSelect: (symbol: string) => void;
  amount: number;
  baseCurrency: string;
}

const CURRENCY_ICONS: Record<string, string> = {
  XLM: '⟠',
  BTC: '₿',
  ETH: 'Ξ',
  USDC: '$',
  USDT: '₮',
};

export default function CryptoSelector({
  currencies,
  selectedCurrency,
  onSelect,
  amount,
  baseCurrency,
}: CryptoSelectorProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Select Cryptocurrency
      </h3>
      
      <div className="space-y-3">
        {currencies.map((currency) => (
          <button
            key={currency.symbol}
            onClick={() => onSelect(currency.symbol)}
            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
              selectedCurrency === currency.symbol
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-2xl">
                {currency.icon || CURRENCY_ICONS[currency.symbol] || currency.symbol[0]}
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">{currency.symbol}</p>
                <p className="text-sm text-gray-500">{currency.name}</p>
                <p className="text-xs text-gray-400">{currency.network}</p>
              </div>
            </div>
            
            <div className="text-right">
              {currency.estimatedValue && (
                <p className="font-semibold text-gray-900">
                  {currency.estimatedValue.toFixed(6)} {currency.symbol}
                </p>
              )}
              <p className="text-sm text-gray-500">
                ≈ {amount.toFixed(2)} {baseCurrency}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
