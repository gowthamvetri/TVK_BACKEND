export interface ISendOTPJob {
  phone: string;
  otp: string;
  purpose: 'registration' | 'forgot_pin' | 'login';
}
