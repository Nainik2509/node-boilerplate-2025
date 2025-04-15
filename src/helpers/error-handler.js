import { ValidationError } from "express-validation";
import envVars from "../config/env-vars.js";
import APIError from "../utils/APIError.js";
import {
  BAD_REQUEST,
  ErrorMessages,
  ErrorTypes,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  TOO_MANY_REQUESTS,
} from "../utils/constants/constants.js";

/**
 * Global error handler middleware
 * @param {Error} err - The error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Response} JSON response with standardized error format
 */
const errorHandler = (err, req, res) => {
  // Base error response structure
  const response = {
    success: false,
    code: err.status || INTERNAL_SERVER_ERROR,
    message: err.message || ErrorMessages.INTERNAL_SERVER_ERROR,
    ...(err.errors && { errors: err.errors }), // Include validation errors if they exist
  };

  // Enhance error response in development environment
  if (envVars.env === "development") {
    response.stack = err.stack;
    response.type = err.constructor.name;
    response.path = req.originalUrl;
    response.method = req.method;
  }

  // Sanitize error response in production
  if (envVars.env === "production") {
    // Obfuscate server errors in production
    if (response.code >= 500) {
      response.message = ErrorMessages.INTERNAL_SERVER_ERROR;
      delete response.errors; // Remove detailed error info
    }
    delete response.stack; // Never expose stack traces in production
  }

  return res.status(response.code).json(response);
};

/**
 * Converts various error types to a standardized APIError format
 * @param {Error} err - The error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Function} Calls the errorHandler with converted error
 */
const convertError = (err, req, res, next) => {
  // Handle Mongoose validation errors (schema validation failures)
  if (err.name === "ValidationError") {
    const errors = Object.entries(err.errors).map(([field, error]) => ({
      location: "body",
      message: error.message,
      field,
      type: error.kind, // Include validation type (e.g., 'required', 'minlength')
    }));

    return errorHandler(
      new APIError({
        message: ErrorTypes.VALIDATION,
        status: BAD_REQUEST,
        errors,
        stack: envVars.env === "development" ? err.stack : undefined,
      }),
      req,
      res,
      next
    );
  }

  // Handle express-validation errors (request payload validation)
  if (err instanceof ValidationError) {
    const errors =
      (err.details
        ? Object.entries(err.details).flatMap(([location, details]) =>
            details.map((e) => ({
              location,
              message: e.message.replace(/[^\w\s]/gi, ""),
              field: e.path?.[0] || "unknown",
            }))
          )
        : err.errors?.map((e) => ({
            location: e.location || "body",
            message: e.messages?.[0]?.replace(/[^\w\s]/gi, "") || ErrorMessages.INVALID_FIELD,
            field: e.field?.[0] || "unknown",
          }))) || [];

    return errorHandler(
      new APIError({
        message: ErrorTypes.VALIDATION,
        status: err.statusCode || BAD_REQUEST,
        errors,
        stack: envVars.env === "development" ? err.stack : undefined,
      }),
      req,
      res,
      next
    );
  }

  // Convert generic errors to APIError format
  if (!(err instanceof APIError)) {
    return errorHandler(
      new APIError({
        message: err.message || ErrorMessages.INTERNAL_SERVER_ERROR,
        status: err.status || INTERNAL_SERVER_ERROR,
        stack: err.stack,
        ...(err.errors && { errors: err.errors }),
      }),
      req,
      res,
      next
    );
  }

  // If it's already an APIError, pass it through directly
  return errorHandler(err, req, res, next);
};

/**
 * Handles 404 Not Found errors for unmatched routes
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Function} Calls the errorHandler with 404 error
 */
const notFoundHandler = (req, res, next) =>
  errorHandler(
    new APIError({
      message: ErrorMessages.NOT_FOUND,
      status: NOT_FOUND,
      ...(envVars.env === "development" && {
        path: req.originalUrl,
        method: req.method,
      }),
    }),
    req,
    res,
    next
  );

/**
 * Handles rate limit exceeded errors (429 Too Many Requests)
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Function} Calls the errorHandler with rate limit error
 */
const rateLimitHandler = (req, res, next) => {
  const err = new APIError({
    message: ErrorMessages.RATE_LIMIT,
    status: TOO_MANY_REQUESTS,
    ...(envVars.env === "development" && {
      limit: req.rateLimit?.limit,
      current: req.rateLimit?.current,
      remaining: req.rateLimit?.remaining,
    }),
  });

  return errorHandler(err, req, res, next);
};

/**
 * Applies all error middleware to the Express application in correct order
 * @param {Express.Application} app - Express application instance
 */
const applyErrorMiddleware = (app) => {
  // The order of these middleware matters:

  // 1. First, convert various error types to APIError format
  app.use(convertError);

  // 2. Specialized handlers for specific cases
  app.use(rateLimitHandler);

  // 3. Catch-all for unmatched routes (must be after all other routes)
  app.use(notFoundHandler);

  // 4. Final error handler (should be last in the chain)
  app.use(errorHandler);
};

export { applyErrorMiddleware, convertError, errorHandler, notFoundHandler, rateLimitHandler };
