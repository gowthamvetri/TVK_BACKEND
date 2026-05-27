export interface ISLACheckJob {
  complaintId: string;
}

export interface IAutoEscalateJob {
  complaintId: string;
  fromRole: string;
  toRole: string;
}
