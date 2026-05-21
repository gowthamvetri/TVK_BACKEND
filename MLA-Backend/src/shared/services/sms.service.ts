/**
 * SMS Service — Twilio
 *
 * Centralised wrapper around the Twilio REST client.
 * Used by:
 *   - AuthService  → OTP delivery for registration / login
 *
 * Configuration (in .env):
 *   TWILIO_ACCOUNT_SID   – your Account SID (starts with AC…)
 *   TWILIO_AUTH_TOKEN    – your Auth Token
 *   TWILIO_FROM_NUMBER   – your Twilio phone number (e.g. +12345678901)
 */

import twilio from 'twilio';
import config from '../../config';
import logger from '../logger';

const { accountSid, authToken, fromNumber } = config.twilio;

let client: twilio.Twilio | null = null;

if (!accountSid || !authToken || !fromNumber) {
  logger.warn(
    '[SmsService] Twilio credentials are missing. ' +
    'OTP will NOT be sent via SMS — check TWILIO_* env vars.'
  );
} else {
  client = twilio(accountSid, authToken);
  logger.info('[SmsService] Twilio client initialised successfully.');
}

/**
 * Convert a bare 10-digit Indian number to E.164 (+91XXXXXXXXXX).
 * If the number already starts with '+', it is returned unchanged.
 */
const _formatNumber = (phone: string | number): string => {
  const phoneStr = String(phone);
  const cleaned = phoneStr.replace(/\D/g, '');
  if (phoneStr.startsWith('+')) return phoneStr;
  // India country code
  return `+91${cleaned}`;
};

/**
 * Core send method — gracefully skips if client is not initialised.
 */
const _send = async (to: string, body: string) => {
  if (!client || !fromNumber) {
    logger.warn(`[SmsService] Skipping SMS to ${to} — Twilio not configured.`);
    return null;
  }

  try {
    const message = await client.messages.create({
      from: fromNumber,
      to,
      body,
    });

    logger.info(`[SmsService] SMS sent to ${to} | SID: ${message.sid}`);
    return message;
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(`[SmsService] Failed to send SMS to ${to}:`, error.message);
    } else {
      logger.error(`[SmsService] Failed to send SMS to ${to}:`, error);
    }
    // Don't throw — SMS failure should never crash the auth flow
    return null;
  }
};

/**
 * Send an OTP message to an Indian mobile number.
 * @param phone  – 10-digit number WITHOUT country code
 * @param otp    – The OTP string to embed in the message
 * @param purpose
 */
const sendOTP = async (
  phone: string | number,
  otp: string,
  purpose: 'registration' | 'login' | 'reset' = 'login'
) => {
  const to = _formatNumber(phone);

  const purposeLabels: Record<string, string> = {
    registration: 'registration',
    login: 'login',
    reset: 'password reset',
  };

  const purposeLabel = purposeLabels[purpose] || purpose;

  const body =
    `Your MLA Grievance System OTP for ${purposeLabel} is: *${otp}*. ` +
    `Valid for ${config.otp.expiryMinutes} minutes. Do not share this with anyone.`;

  return _send(to, body);
};

const smsService = {
  sendOTP,
};

export default smsService;
