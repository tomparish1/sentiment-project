import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import { apiRoutes } from './api/routes.js';
import { swaggerSpec } from './api/swagger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(requestLogger);

  // API Documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // API Routes
  app.use('/api', apiRoutes);

  // Static files (for production - in dev, Vite serves these)
  const publicPath = path.join(__dirname, '..', 'public');
  app.use(express.static(publicPath));

  // SPA fallback
  app.get('*', (req, res, _next) => {
    if (req.path.startsWith('/api')) {
      notFoundHandler(req, res);
      return;
    }
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  // Error handling
  app.use(errorHandler);

  return app;
}
