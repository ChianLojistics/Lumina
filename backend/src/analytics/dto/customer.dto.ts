export class CustomerSegmentDto {
  segment: string;
  count: number;
  avgSpent: number;
  avgTransactions: number;
  churnRate: number;
}

export class CustomerCohortDto {
  cohort: string;
  period: string;
  customers: number;
  retention: number;
  avgSpent: number;
}

export class FunnelStageDto {
  stage: string;
  count: number;
  conversionRate: number;
  dropOff: number;
}

export class CustomerAnalyticsDto {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  segments: CustomerSegmentDto[];
  cohorts: CustomerCohortDto[];
  funnel: FunnelStageDto[];
}
