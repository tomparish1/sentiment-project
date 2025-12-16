import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import type { ErrorResponse } from '../types/sentiment.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction
): void {
  logger.error({ err, path: req.path, method: req.method }, 'Error occurred');

  if (err instanceof ZodError) {
    const details = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    res.status(400).json({
      error: 'Validation error',
      details,
      statusCode: 400,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
      statusCode: err.statusCode,
    });
    return;
  }

  // Handle Anthropic API errors
  if (err.name === 'APIError' || err.name === 'AuthenticationError') {
    res.status(502).json({
      error: 'External API error',
      details: err.message,
      statusCode: 502,
    });
    return;
  }

  // Default error
  const details = process.env['NODE_ENV'] === 'development' ? err.message : undefined;
  res.status(500).json({
    error: 'Internal server error',
    ...(details && { details }),
    statusCode: 500,
  });
}

export function notFoundHandler(req: Request, res: Response<ErrorResponse>): void {
  res.status(404).json({
    error: 'Not found',
    details: `Cannot ${req.method} ${req.path}`,
    statusCode: 404,
  });
}
