import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { errorHandler, AppError, notFoundHandler } from '../../src/middleware/errorHandler.js';
import type { ErrorResponse } from '../../src/types/sentiment.js';

describe('errorHandler', () => {
  const mockRequest = () =>
    ({
      path: '/test',
      method: 'POST',
    }) as Request;

  const mockResponse = () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response<ErrorResponse>;
    return res;
  };

  const mockNext = vi.fn();

  it('should handle ZodError', () => {
    const req = mockRequest();
    const res = mockResponse();
    const zodError = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['text'],
        message: 'Required',
      },
    ]);

    errorHandler(zodError, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation error',
      details: 'text: Required',
      statusCode: 400,
    });
  });

  it('should handle AppError', () => {
    const req = mockRequest();
    const res = mockResponse();
    const appError = new AppError(404, 'Not found', 'Resource does not exist');

    errorHandler(appError, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      details: 'Resource does not exist',
      statusCode: 404,
    });
  });

  it('should handle generic errors', () => {
    const req = mockRequest();
    const res = mockResponse();
    const error = new Error('Something went wrong');

    errorHandler(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    // In test environment (NODE_ENV=test), details are not included
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      statusCode: 500,
    });
  });
});

describe('notFoundHandler', () => {
  it('should return 404 response', () => {
    const req = {
      method: 'GET',
      path: '/unknown',
    } as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response<ErrorResponse>;

    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      details: 'Cannot GET /unknown',
      statusCode: 404,
    });
  });
});
