import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Express error handling middleware that logs errors and returns
 * appropriate HTTP responses with error details.
 * 
 * @param error - The error object with optional statusCode and isOperational properties
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * 
 * @example
 * ```typescript
 * import { errorHandler } from './middleware/error-handler';
 * 
 * app.use(errorHandler);
 * ```
 */
export function errorHandler(
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(statusCode).json({
    error: message,
    ...(isDevelopment && { stack: error.stack }),
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  });
}

/**
 * Creates a custom application error with status code and operational flag.
 * 
 * @param message - Error message
 * @param statusCode - HTTP status code (default: 500)
 * @returns {AppError} Custom error object
 * 
 * @example
 * ```typescript
 * import { createError } from './middleware/error-handler';
 * 
 * throw createError('User not found', 404);
 * ```
 */
export function createError(message: string, statusCode: number = 500): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

/**
 * Wraps async route handlers to catch and forward errors to error middleware.
 * 
 * @param fn - Async function to wrap
 * @returns {Function} Wrapped function with error handling
 * 
 * @example
 * ```typescript
 * import { asyncHandler } from './middleware/error-handler';
 * 
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await getUsersFromDB();
 *   res.json(users);
 * }));
 * ```
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}