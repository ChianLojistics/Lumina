import { EmailTemplate } from './email-template.enum';

interface EmailContent {
  subject: string;
  html: string;
}

export function buildEmailContent(
  template: EmailTemplate,
  data: Record<string, any> = {},
): EmailContent {
  switch (template) {
    case EmailTemplate.PAYMENT_CONFIRMATION:
      return {
        subject: `Payment confirmed: ${data.payment_id ?? ''}`,
        html: `<p>Your payment of ${data.amount ?? ''} ${data.currency ?? ''} has been confirmed.</p>`,
      };
    case EmailTemplate.PAYMENT_FAILURE:
      return {
        subject: `Payment failed: ${data.payment_id ?? ''}`,
        html: `<p>Your payment of ${data.amount ?? ''} ${data.currency ?? ''} could not be processed.</p>`,
      };
    case EmailTemplate.ESCROW_CREATED:
      return {
        subject: `Escrow created: ${data.escrow_id ?? ''}`,
        html: `<p>An escrow of ${data.amount ?? ''} ${data.currency ?? ''} has been created.</p>`,
      };
    case EmailTemplate.SUBSCRIPTION_BILLED:
      return {
        subject: `Subscription billed: ${data.subscription_id ?? ''}`,
        html: `<p>Your subscription was billed ${data.amount ?? ''} ${data.currency ?? ''}.</p>`,
      };
    case EmailTemplate.DAILY_SUMMARY:
      return {
        subject: 'Your daily payment summary',
        html: `<p>You received ${data.total_amount ?? ''} across ${data.payment_count ?? 0} payments today.</p>`,
      };
    case EmailTemplate.WEEKLY_SUMMARY:
      return {
        subject: 'Your weekly payment summary',
        html: `<p>You received ${data.total_amount ?? ''} across ${data.payment_count ?? 0} payments this week.</p>`,
      };
    default:
      throw new Error(`Unknown email template: ${template}`);
  }
}
