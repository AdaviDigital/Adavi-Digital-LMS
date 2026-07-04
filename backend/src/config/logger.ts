import winston from 'winston';
import { env } from './env';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} [${level}] ${message}${metaStr}`;
  }),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (env.NODE_ENV === 'development' ? 'debug' : 'info'),
  format: env.NODE_ENV === 'development' ? devFormat : prodFormat,
  defaultMeta: { service: 'adavi-lms-api' },
  transports: [new winston.transports.Console()],
  // Never crash the process because logging itself failed.
  exitOnError: false,
});

/**
 * A minimal stream adapter so `morgan` (HTTP access logging) writes through the same
 * structured logger/transport instead of directly to stdout — keeps all logs in one place
 * with consistent formatting, which matters once logs are shipped to an aggregator.
 */
export const httpLogStream = {
  write: (message: string) => logger.info(message.trim(), { type: 'http' }),
};
