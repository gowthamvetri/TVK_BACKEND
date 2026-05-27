export interface IGeneratePDFJob {
  reportId: string;
  filters: Record<string, unknown>;
  userId: string;
}

export interface IGenerateCSVJob {
  reportId: string;
  filters: Record<string, unknown>;
  userId: string;
}
