import { EventFilterService } from './event-filter.service';

describe('EventFilterService', () => {
  let service: EventFilterService;

  beforeEach(() => {
    service = new EventFilterService();
  });

  it('delivers if event type is subscribed and no filters set', () => {
    const subscription = { events: ['payment.created'] };
    const event = { type: 'payment.created', amount: 100 };
    expect(service.shouldDeliver(subscription, event)).toBe(true);
  });

  it('rejects if event type is not subscribed', () => {
    const subscription = { events: ['payment.created'] };
    const event = { type: 'payment.failed', amount: 100 };
    expect(service.shouldDeliver(subscription, event)).toBe(false);
  });

  it('filters by minimum amount', () => {
    const subscription = {
      events: ['payment.created'],
      filters: { amount: { min: 50 } },
    };
    expect(service.shouldDeliver(subscription, { type: 'payment.created', amount: 30 })).toBe(false);
    expect(service.shouldDeliver(subscription, { type: 'payment.created', amount: 50 })).toBe(true);
    expect(service.shouldDeliver(subscription, { type: 'payment.created', amount: 100 })).toBe(true);
  });

  it('filters by maximum amount', () => {
    const subscription = {
      events: ['payment.created'],
      filters: { amount: { max: 200 } },
    };
    expect(service.shouldDeliver(subscription, { type: 'payment.created', amount: 150 })).toBe(true);
    expect(service.shouldDeliver(subscription, { type: 'payment.created', amount: 250 })).toBe(false);
  });

  it('filters by currency', () => {
    const subscription = {
      events: ['payment.created'],
      filters: { currency: ['USDC', 'XLM'] },
    };
    expect(service.shouldDeliver(subscription, { type: 'payment.created', currency: 'USDC' })).toBe(true);
    expect(service.shouldDeliver(subscription, { type: 'payment.created', currency: 'BTC' })).toBe(false);
  });

  it('filters by status', () => {
    const subscription = {
      events: ['payment.created'],
      filters: { status: ['confirmed', 'completed'] },
    };
    expect(service.shouldDeliver(subscription, { type: 'payment.created', status: 'confirmed' })).toBe(true);
    expect(service.shouldDeliver(subscription, { type: 'payment.created', status: 'pending' })).toBe(false);
  });
});
