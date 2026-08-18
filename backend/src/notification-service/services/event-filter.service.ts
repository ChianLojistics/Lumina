import { Injectable } from '@nestjs/common';
import { Webhook } from '../entities/webhook.entity';

export interface WebhookSubscription {
  id?: string;
  url?: string;
  events: string[];
  filters?: {
    amount?: { min?: number; max?: number };
    currency?: string[];
    status?: string[];
  };
  secret?: string;
  isActive?: boolean;
  is_active?: boolean;
  headers?: Record<string, string>;
}

@Injectable()
export class EventFilterService {
  shouldDeliver(subscription: WebhookSubscription | Webhook, event: any): boolean {
    const eventType = typeof event === 'string' ? event : event?.type || event?.event;
    if (!subscription.events || !subscription.events.includes(eventType)) {
      return false;
    }

    if (!subscription.filters) {
      return true;
    }

    const payloadData = typeof event === 'object' && event !== null ? (event.data || event.payload || event) : {};

    // Check amount filter
    if (subscription.filters.amount) {
      const { min, max } = subscription.filters.amount;
      const amount = payloadData.amount !== undefined ? payloadData.amount : event.amount;
      if (amount !== undefined) {
        if (min !== undefined && amount < min) return false;
        if (max !== undefined && amount > max) return false;
      }
    }

    // Check currency filter
    if (subscription.filters.currency && subscription.filters.currency.length > 0) {
      const currency = payloadData.currency !== undefined ? payloadData.currency : event.currency;
      if (currency !== undefined && !subscription.filters.currency.includes(currency)) {
        return false;
      }
    }

    // Check status filter
    if (subscription.filters.status && subscription.filters.status.length > 0) {
      const status = payloadData.status !== undefined ? payloadData.status : event.status;
      if (status !== undefined && !subscription.filters.status.includes(status)) {
        return false;
      }
    }

    return true;
  }
}
