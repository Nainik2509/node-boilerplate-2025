/**
 * HTTP Status Codes and related error messages
 * Organized by status code categories for better maintainability
 */

// Client Error Responses (4xx)
export const BAD_REQUEST = 400;
export const NOT_FOUND = 404;
export const TOO_MANY_REQUESTS = 429;

// Server Error Responses (5xx)
export const INTERNAL_SERVER_ERROR = 500;

// Error Messages
export const ErrorMessages = {
  VALIDATION: "Validation Error",
  NOT_FOUND: "No record found",
  RATE_LIMIT: "Too many requests",
  DEFAULT: "An error occurred",
};

// Error Types (for error classification)
export const ErrorTypes = {
  VALIDATION: "VALIDATION_ERROR",
  NOT_FOUND: "RESOURCE_NOT_FOUND",
  RATE_LIMIT: "RATE_LIMIT_EXCEEDED",
  SERVER: "INTERNAL_SERVER_ERROR",
};

// Optional: Status Code to Default Message mapping
export const StatusToDefaultMessage = {
  [BAD_REQUEST]: ErrorMessages.VALIDATION,
  [NOT_FOUND]: ErrorMessages.NOT_FOUND,
  [TOO_MANY_REQUESTS]: ErrorMessages.RATE_LIMIT,
  [INTERNAL_SERVER_ERROR]: ErrorMessages.DEFAULT,
};
