export default class APIError extends Error {
  /**
   * Custom API Error class for handling API-related errors
   * @param {Object} options - Error configuration options
   * @param {string} options.message - Human-readable error message
   * @param {number} options.status - HTTP status code
   * @param {Array|Object} [options.errors] - Additional error details or validation errors
   * @param {string} [options.stack] - Custom stack trace (useful for error forwarding)
   */
  constructor({ message, status, errors = null, stack = null }) {
    super(message);

    // Ensure proper prototype chain for custom errors
    Object.setPrototypeOf(this, new.target.prototype);

    // Standard properties
    this.name = this.constructor.name;
    this.status = status;
    this.errors = errors;
    this.timestamp = new Date().toISOString();

    // Stack trace handling
    if (stack) {
      this.stack = stack;
    } else if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serializes error for API response
   * @returns {Object} - Error representation suitable for API response
   */
  toJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        status: this.status,
        errors: this.errors,
        timestamp: this.timestamp,
      },
    };
  }
}
