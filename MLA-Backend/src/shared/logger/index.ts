/**
 * Winston Logger
 * Structured logging with file and console transports.
 */
import { createLogger, format, transports } from 'winston';
import path from 'path';

const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (stack) log += `\n${stack}`;
    if (Object.keys(meta).length) log += ` ${JSON.stringify(meta)}`;
    return log;
  })
);

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: logFormat,
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), logFormat),
    }),
  ],
  exitOnError: false,
});

export default logger;
