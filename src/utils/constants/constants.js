/**
 * HTTP Status Codes and related error messages
 * Organized by status code categories for better maintainability
 */

// Successful Responses (2xx)
export const OK = 200;
export const CREATED = 201;
export const ACCEPTED = 202;
export const NO_CONTENT = 204;

// Client Error Responses (4xx)
export const BAD_REQUEST = 400;
export const UNAUTHORIZED = 401;
export const PAYMENT_REQUIRED = 402;
export const FORBIDDEN = 403;
export const NOT_FOUND = 404;
export const METHOD_NOT_ALLOWED = 405;
export const REQUEST_TIMEOUT = 408;
export const PAYLOAD_TOO_LARGE = 413;
export const URI_TOO_LONG = 414;
export const UNSUPPORTED_MEDIA_TYPE = 415;
export const UNPROCESSABLE_ENTITY = 422;
export const TOO_MANY_REQUESTS = 429;

// Server Error Responses (5xx)
export const INTERNAL_SERVER_ERROR = 500;
export const BAD_GATEWAY = 502;
export const SERVICE_UNAVAILABLE = 503;
export const GATEWAY_TIMEOUT = 504;
export const INSUFFICIENT_STORAGE = 507;
export const NETWORK_AUTHENTICATION_REQUIRED = 511;

// Error Messages
export const ErrorMessages = {
  // General
  DEFAULT: "An error occurred",
  INTERNAL_SERVER_ERROR: "Internal Server Error",
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Access forbidden",

  // Validation
  VALIDATION: "Validation Error",
  INVALID_INPUT: "Invalid input provided",
  MISSING_FIELDS: "Required fields are missing",

  // Resources
  INVALID_FIELD: "Invalid field",
  NOT_FOUND: "Resource not found",
  RESOURCE_CONFLICT: "Resource already exists",
  RESOURCE_GONE: "Resource no longer available",

  // Authentication
  INVALID_CREDENTIALS: "Invalid credentials",
  TOKEN_EXPIRED: "Authentication token expired",
  SESSION_EXPIRED: "Session expired",

  // Rate limiting
  RATE_LIMIT: "Too many requests",

  // System
  MAINTENANCE: "System under maintenance",
  SERVICE_DOWN: "Service temporarily unavailable",

  // Business logic
  BUSINESS_RULE: "Business rule violation",
  PAYMENT_REQUIRED: "Payment required",
  QUOTA_EXCEEDED: "Quota exceeded",
};
// Error Types (for error classification)
export const ErrorTypes = {
  // General
  SERVER: "INTERNAL_SERVER_ERROR",
  NETWORK: "NETWORK_ERROR",

  // Client
  VALIDATION: "VALIDATION_ERROR",
  INPUT: "INVALID_INPUT_ERROR",

  // Resources
  NOT_FOUND: "RESOURCE_NOT_FOUND",
  CONFLICT: "RESOURCE_CONFLICT",

  // Authentication
  AUTH: "AUTHENTICATION_ERROR",
  PERMISSION: "PERMISSION_ERROR",

  // Rate limiting
  RATE_LIMIT: "RATE_LIMIT_EXCEEDED",

  // System
  MAINTENANCE: "MAINTENANCE_MODE",
  UNAVAILABLE: "SERVICE_UNAVAILABLE",

  // Business
  BUSINESS: "BUSINESS_RULE_ERROR",
  PAYMENT: "PAYMENT_REQUIRED",
};

// Status Code to Default Message mapping
export const StatusToDefaultMessage = {
  // 4xx
  [BAD_REQUEST]: ErrorMessages.VALIDATION,
  [UNAUTHORIZED]: ErrorMessages.UNAUTHORIZED,
  [FORBIDDEN]: ErrorMessages.FORBIDDEN,
  [NOT_FOUND]: ErrorMessages.NOT_FOUND,
  [METHOD_NOT_ALLOWED]: "Method not allowed",
  [UNPROCESSABLE_ENTITY]: ErrorMessages.VALIDATION,
  [TOO_MANY_REQUESTS]: ErrorMessages.RATE_LIMIT,

  // 5xx
  [INTERNAL_SERVER_ERROR]: ErrorMessages.DEFAULT,
  [BAD_GATEWAY]: "Bad gateway",
  [SERVICE_UNAVAILABLE]: ErrorMessages.SERVICE_DOWN,
  [GATEWAY_TIMEOUT]: "Gateway timeout",

  // Default fallback
  default: ErrorMessages.DEFAULT,
};

// Success Messages
export const SuccessMessages = {
  GENERAL: "Operation successful",
  CREATED: "Resource created successfully",
  UPDATED: "Resource updated successfully",
  DELETED: "Resource deleted successfully",
  RETRIEVED: "Resource retrieved successfully",
};
