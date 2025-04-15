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
} from "../utils/constants.js";

/**
 * Global error handler middleware
 * @param {Error} err - The error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Response} JSON response with error details
 */
const errorHandler = (err, req, res) => {
  // Base error response structure
  const response = {
    success: false,
    code: err.status || INTERNAL_SERVER_ERROR,
    message: err.message || "Internal Server Error",
    ...(err.errors && { errors: err.errors }), // Only include errors if they exist
  };

  // Development mode enhancements
  if (envVars.env === "development") {
    response.stack = err.stack;
    response.type = err.constructor.name; // Include error type for debugging
  }

  // Production mode sanitization
  if (envVars.env === "production") {
    // Obfuscate server errors in production
    if (response.code >= 500) {
      response.message = "Internal Server Error";
    }

    // Remove stack traces and detailed errors in production
    delete response.stack;
    if (response.code >= 500) {
      delete response.errors;
    }
  }

  return res.status(response.code).json(response);
};

/**
 * Normalizes different error types to consistent APIError format
 * @param {Error} err - The error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Function} Calls the errorHandler with converted error
 */
const convertError = (err, req, res, next) => {
  // Handle ValidationError (from express-validation)
  if (err instanceof ValidationError) {
    const errors = err.details
      ? Object.entries(err.details).flatMap(([location, details]) =>
          details.map((e) => ({
            location,
            message: e.message.replace(/[^\w\s]/gi, ""), // Sanitize message
            field: e.path?.[0] || "unknown",
          }))
        )
      : err.errors?.map((e) => ({
          location: e.location || "body",
          message: e.messages?.[0]?.replace(/[^\w\s]/gi, "") || "Invalid field",
          field: e.field?.[0] || "unknown",
        })) || [];

    const convertedError = new APIError({
      message: ErrorTypes.VALIDATION,
      status: err.statusCode || BAD_REQUEST,
      errors,
      stack: envVars.env === "development" ? err.stack : undefined,
    });
    return errorHandler(convertedError, req, res, next);
  }

  // Convert non-APIError instances to APIError
  if (!(err instanceof APIError)) {
    const convertedError = new APIError({
      message: err.message,
      status: err.status || INTERNAL_SERVER_ERROR,
      stack: err.stack,
      ...(err.errors && { errors: err.errors }),
    });
    return errorHandler(convertedError, req, res, next);
  }

  // If it's already an APIError, pass it through
  return errorHandler(err, req, res, next);
};

/**
 * Handles 404 Not Found errors
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Function} Calls the errorHandler with 404 error
 */
const notFoundHandler = (req, res, next) => {
  const err = new APIError({
    message: ErrorMessages.NOT_FOUND,
    status: NOT_FOUND,
    // Additional context could be added here:
    // path: req.originalUrl,
    // method: req.method,
  });
  return errorHandler(err, req, res, next);
};

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
    // Could add rate limit details if available:
    // limit: req.rateLimit.limit,
    // current: req.rateLimit.current,
    // remaining: req.rateLimit.remaining,
  });
  return errorHandler(err, req, res, next);
};

/**
 * Applies all error middleware to the Express application in correct order
 * @param {Express.Application} app - Express application instance
 */
const applyErrorMiddleware = (app) => {
  // Error conversion should be first to normalize errors
  app.use(convertError);

  // Specialized handlers for specific error cases
  app.use(rateLimitHandler);

  // 404 handler for unmatched routes (should be after all other routes)
  app.use(notFoundHandler);

  // Generic error handler (should be last in the chain)
  app.use(errorHandler);
};

export { applyErrorMiddleware, convertError, errorHandler, notFoundHandler, rateLimitHandler };
