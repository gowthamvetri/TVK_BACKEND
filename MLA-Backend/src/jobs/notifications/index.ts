export interface ISendSMSJob {
  phone: string;
  message: string;
}

export interface IWebsocketBroadcastJob {
  event: string;
  room?: string;
  payload: Record<string, unknown>;
}
