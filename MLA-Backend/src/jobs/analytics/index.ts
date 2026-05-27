export interface IAggregateKPIsJob {
  ward?: number;
  period: 'daily' | 'weekly' | 'monthly';
}

export interface IRefreshDashboardJob {
  force?: boolean;
}
