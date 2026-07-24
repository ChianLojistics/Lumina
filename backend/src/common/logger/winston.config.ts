import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import { RequestContext } from './request-context';
import { redact } from './redact.util';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');
const logDir = process.env.LOG_DIR || 'logs';

const withRequestId = winston.format((info) => {
  const requestId = RequestContext.requestId;
  if (requestId) {
    info.requestId = requestId;
  }
  return info;
});

const redactSensitiveData = winston.format((info) => redact(info));

const jsonFileFormat = winston.format.combine(
  withRequestId(),
  redactSensitiveData(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  withRequestId(),
  redactSensitiveData(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.ms(),
  isProduction
    ? winston.format.json()
    : nestWinstonModuleUtilities.format.nestLike('Lumina', {
        colors: true,
        prettyPrint: true,
        processId: false,
        appName: false,
      }),
);

export const winstonConfig: winston.LoggerOptions = {
  level: logLevel,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'lumina-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      maxSize: '20m',
      format: jsonFileFormat,
    }),
    new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'lumina-combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
      format: jsonFileFormat,
    }),
  ],
  exitOnError: false,
};
