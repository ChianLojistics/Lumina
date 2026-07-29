'use client';

import React from 'react';
import { Loader2, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

interface StatusIndicatorProps {
  readonly status: PaymentStatus;
  readonly transactionHash?: string;
  readonly blockExplorerUrl?: string;
}

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Pending',
    description: 'Waiting for payment...',
  },
  processing: {
    icon: Loader2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Processing',
    description: 'Transaction is being confirmed...',
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Completed',
    description: 'Payment successful!',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Failed',
    description: 'Payment failed or was rejected.',
  },
  expired: {
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    label: 'Expired',
    description: 'Payment window has expired.',
  },
};

export default function StatusIndicator({
  status,
  transactionHash,
  blockExplorerUrl,
}: Readonly<StatusIndicatorProps>) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  return (
    <div className={`p-6 rounded-2xl border-2 ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${config.bgColor}`}>
          <Icon className={`w-8 h-8 ${config.color} ${status === 'processing' ? 'animate-spin' : ''}`} />
        </div>
        <div className="flex-1">
          <h3 className={`text-xl font-semibold ${config.color}`}>{config.label}</h3>
          <p className="text-sm text-gray-600 mt-1">{config.description}</p>
        </div>
      </div>

      {transactionHash && status === 'completed' && (
        <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Transaction Hash:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono text-gray-900">
              {truncateHash(transactionHash)}
            </code>
            {blockExplorerUrl && (
              <a
                href={`${blockExplorerUrl}/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="w-4 h-4" />
                View
              </a>
            )}
          </div>
        </div>
      )}

      {status === 'processing' && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">Confirming transaction...</p>
        </div>
      )}
    </div>
  );
}
