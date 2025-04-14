import envVars from './config/env-vars.js';
import app from './config/express.js';
import { connectDB } from './config/lib/db.js';
import logger from './config/logger.js';
import chalk from 'chalk';

// Destructure environment variables
const { port, env, appName } = envVars;

/**
 * Starts the Express server with enhanced logging and error handling
 * @returns {import('http').Server} The HTTP server instance
 */
function startServer() {
  const server = app.listen(port);

  server.on('listening', () => {
    const envColor = env === 'production' ? chalk.redBright : chalk.greenBright;
    const envDisplay = envColor.bold(`[${env.toUpperCase()}]`);
    const appDisplay = chalk.blueBright.bold(appName || 'Express App');
    const urlDisplay = chalk.cyanBright(`http://localhost:${port}`);
    const pidDisplay = chalk.yellowBright(process.pid);

    logger.info(`
      ${appDisplay} ${envDisplay}
      🚀 Server ready at ${urlDisplay}
      PID: ${pidDisplay}
    `);

    connectDB();
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${port} is already in use`);
      process.exit(1);
    }
    logger.error('Server startup error:', error);
    process.exit(1);
  });

  setupGracefulShutdown(server);

  return server;
}

/**
 * Configures graceful shutdown handlers for the server
 * @param {import('http').Server} server
 */
function setupGracefulShutdown(server) {
  const shutdown = (signal) => {
    logger.info(`${signal} received - shutting down gracefully`);
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });

    // Force shutdown if server doesn't close in time
    setTimeout(() => {
      logger.warn('Forcing server shutdown');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start the server and export references
const server = startServer();
export { server };

