import mongoose from 'mongoose';
import envVars from '../env-vars.js';
import logger from '../logger.js';

// Use native JavaScript promises
mongoose.Promise = global.Promise;

/**
 * MongoDB connection event handlers
 */
mongoose.connection.on('error', (err) => {
  logger.error(`❌ MongoDB connection error: ${err.message}`);
});

mongoose.connection.on('connected', () => {
  logger.info(`✅ MongoDB connected to ${envVars.mongo.uri}`);
  logger.debug(`Environment: ${envVars.env}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ MongoDB disconnected');
  // Auto-reconnect after 5 seconds
  setTimeout(connectDB, 5000);
});

mongoose.connection.on('reconnected', () => {
  logger.info('♻️ MongoDB reconnected');
});

mongoose.connection.on('close', () => {
  logger.info('🚪 MongoDB connection closed');
});

/**
 * Establishes MongoDB connection
 * @returns {Promise<mongoose.Connection>} Mongoose connection instance
 * @throws {Error} If connection fails
 */
export const connectDB = async () => {
  try {
    const connection = await mongoose.connect(
      envVars.mongo.uri,
      envVars.mongo.options,
    );

    logger.debug(
      `MongoDB connection pool size: ${connection.connection.poolSize}`,
    );
    return connection;
  } catch (error) {
    logger.error(`💥 MongoDB connection failed: ${error.message}`);
    logger.debug('Retrying connection in 5 seconds...');

    // Auto-retry after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

// Export the mongoose instance for direct access if needed
export { mongoose };

