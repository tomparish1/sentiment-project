import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

export function validateRequest<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        statusCode: 400,
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
