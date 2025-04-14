import winston from "winston";
import envVars from "./env-vars.js";

const { format, transports } = winston;

/**
 * Winston log levels (priority from high to low):
 * {
 *   error: 0,
 *   warn: 1,
 *   info: 2,
 *   http: 3,
 *   verbose: 4,
 *   debug: 5,
 *   silly: 6
 * }
 */

/**
 * Formats log message parameters into a consistent string format
 * @param {Object} params - Log message parameters
 * @param {string} params.timestamp - ISO timestamp
 * @param {string} params.level - Log level
 * @param {string} params.message - Primary log message
 * @param {Object} params.args - Additional metadata
 * @returns {string} Formatted log message
 */
const formatLogEntry = ({ timestamp, level, message, ...args }) => {
  // Simplify timestamp and remove timezone info for better readability
  const simplifiedTimestamp = timestamp.slice(0, 19).replace("T", " ");

  // Only include additional args if they exist
  const additionalArgs = Object.keys(args).length
    ? JSON.stringify(args, null, envVars.env === "development" ? 2 : 0)
    : "";

  return `${simplifiedTimestamp} ${level}: ${message} ${additionalArgs}`;
};

// Combined format for logs
const logFormat = format.combine(
  format.colorize({ all: true }), // Colorize entire message, not just level
  format.timestamp({ format: "isoDateTime" }),
  format.align(),
  format.errors({ stack: true }), // Include error stacks if available
  format.printf(formatLogEntry)
);

/**
 * Transport configuration based on environment:
 * - Production: Write errors to file
 * - Development: Log to console with colors and human-readable format
 */
const getTransports = () => {
  const baseTransports = [
    // Always log to console in development
    new transports.Console({
      handleExceptions: true, // Catch and log unhandled exceptions
      handleRejections: true, // Catch and log unhandled promise rejections
    }),
  ];

  if (envVars.env === "production") {
    baseTransports.push(
      new transports.File({
        filename: "logs/error.log",
        level: "error",
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: format.combine(
          format.uncolorize(), // Remove colors for file logs
          format.timestamp(),
          format.json() // Structured logs for production analysis
        ),
      }),
      new transports.File({
        filename: "logs/combined.log",
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
  }

  return baseTransports;
};

// Create logger instance
const logger = winston.createLogger({
  level: envVars.logLevel || "info", // Default to 'info' if not specified
  format: logFormat,
  transports: getTransports(),
  // In production, also log to console if we're in a cloud environment
  silent: envVars.env === "test", // Disable logging during tests
  exitOnError: false, // Don't crash on logger errors
});

// Add stream for morgan (HTTP request logging)
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

export default logger;
