import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

const app = createApp();

const server = app.listen(config.PORT, () => {
  logger.info('Sentiment Analyzer v0.4.0');
  logger.info(`Server running at http://localhost:${String(config.PORT)}`);
  logger.info(`API Docs at http://localhost:${String(config.PORT)}/api/docs`);
  logger.info(`Environment: ${config.NODE_ENV}`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  shutdown('SIGINT');
});
