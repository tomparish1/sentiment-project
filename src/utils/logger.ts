import pino from 'pino';
import { config } from '../config/index.js';

const loggerOptions: pino.LoggerOptions = {
  level: config.LOG_LEVEL,
  base: {
    env: config.NODE_ENV,
  },
};

if (config.NODE_ENV === 'development') {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}

export const logger = pino(loggerOptions);

export type Logger = typeof logger;
