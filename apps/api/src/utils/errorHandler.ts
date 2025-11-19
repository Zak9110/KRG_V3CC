import { Response } from 'express';
import { logError } from '../config/logger';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR'): AppError => {
  return new AppError(message, statusCode, code);
};

export const handleError = (error: any, res: Response, customMessage?: string) => {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = customMessage || 'An unexpected error occurred';

  // Handle AppError instances
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
  }
  // Handle Prisma errors
  else if (error?.code) {
    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        code = 'DUPLICATE_ENTRY';
        message = 'A record with this information already exists';
        break;
      case 'P2025':
        statusCode = 404;
        code = 'NOT_FOUND';
        message = 'The requested resource was not found';
        break;
      default:
        statusCode = 500;
        code = 'DATABASE_ERROR';
        message = 'A database error occurred';
    }
  }
  // Handle validation errors (Zod)
  else if (error?.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid input data';
  }
  // Handle JWT errors
  else if (error?.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }
  else if (error?.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }

  // Log the error
  logError('API Error', error, {
    statusCode,
    code,
    message,
    stack: error?.stack
  });

  // Send error response
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' && { details: error?.message, stack: error?.stack })
    }
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      handleError(error, res);
    });
  };
};

// Common error types
export const errors = {
  // Authentication errors
  UNAUTHORIZED: (message = 'Authentication required') =>
    createError(message, 401, 'UNAUTHORIZED'),

  FORBIDDEN: (message = 'Insufficient permissions') =>
    createError(message, 403, 'FORBIDDEN'),

  INVALID_CREDENTIALS: (message = 'Invalid email or password') =>
    createError(message, 401, 'INVALID_CREDENTIALS'),

  ACCOUNT_DISABLED: (message = 'Your account has been disabled') =>
    createError(message, 403, 'ACCOUNT_DISABLED'),

  // Validation errors
  VALIDATION_ERROR: (message = 'Invalid input data') =>
    createError(message, 400, 'VALIDATION_ERROR'),

  MISSING_FIELDS: (message = 'Required fields are missing') =>
    createError(message, 400, 'MISSING_FIELDS'),

  // Resource errors
  NOT_FOUND: (message = 'Resource not found') =>
    createError(message, 404, 'NOT_FOUND'),

  ALREADY_EXISTS: (message = 'Resource already exists') =>
    createError(message, 409, 'ALREADY_EXISTS'),

  CONFLICT: (message = 'Operation conflicts with current state') =>
    createError(message, 409, 'CONFLICT'),

  // Business logic errors
  INVALID_STATUS: (message = 'Invalid status transition') =>
    createError(message, 400, 'INVALID_STATUS'),

  APPLICATION_LOCKED: (message = 'Application is locked and cannot be modified') =>
    createError(message, 423, 'APPLICATION_LOCKED'),

  QUOTA_EXCEEDED: (message = 'Daily quota exceeded') =>
    createError(message, 429, 'QUOTA_EXCEEDED'),

  // System errors
  INTERNAL_ERROR: (message = 'An unexpected error occurred') =>
    createError(message, 500, 'INTERNAL_ERROR'),

  DATABASE_ERROR: (message = 'Database operation failed') =>
    createError(message, 500, 'DATABASE_ERROR'),

  EXTERNAL_SERVICE_ERROR: (message = 'External service unavailable') =>
    createError(message, 502, 'EXTERNAL_SERVICE_ERROR'),
};
