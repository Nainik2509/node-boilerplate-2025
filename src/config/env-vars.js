import dotenv from 'dotenv';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Get the current file and directory paths in ES module format
 * These are equivalents to __filename and __dirname in CommonJS
 */
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

// Load environment variables from .env file located two directories up
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Morgan configuration for production environment
 * - Skips logging requests with status codes <= 400 (successful requests)
 * - Writes logs to an access.log file with append mode
 */
const MorganProd = {
  skip(req, res) {
    return res.statusCode <= 400;
  },
  stream: fs.createWriteStream(path.join(__dirname, '../../access.log'), {
    flags: 'a', // 'a' means append (old data will be preserved)
  }),
};

/**
 * Environment variables configuration object
 * Centralized place for all environment-dependent configurations
 */
const envVars = {
  // Basic app configuration
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  appName: 'AskAStudent',

  // Logging configuration
  Level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
  logs: process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
  morganConfig: process.env.NODE_ENV === 'production' ? MorganProd : {},

  // Security-related configurations
  sessionSecret: process.env.SESSION_SECRET,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpirationInterval: process.env.JWT_EXPIRATION_MINUTES,
  saltRound: process.env.NODE_ENV === 'development' ? 5 : 10, // Lower rounds for dev for faster hashing

  // Database configuration
  mongo: {
    uri:
      process.env.NODE_ENV === 'development'
        ? process.env.MONGO_URI_TEST
        : process.env.MONGO_URI,
    options: {
      autoIndex: process.env.NODE_ENV === 'development', // Auto-create indexes in dev only
      maxPoolSize: 50, // Recommended pool size for most applications
      minPoolSize: 5, // Maintain minimum connections
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
      heartbeatFrequencyMS: 10000, // How often to check connection status
      retryWrites: true, // Enable retryable writes
      retryReads: true, // Enable retryable reads
      connectTimeoutMS: 30000, // Timeout for initial connection
      waitQueueTimeoutMS: 10000, // Timeout for connection from pool
    },
  },
};

export default envVars;

