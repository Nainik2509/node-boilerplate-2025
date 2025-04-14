import { createServer } from "http";
import envVars from "./config/env-vars.js";
import app from "./config/express.js";
import { connectDB } from "./config/lib/db.js";
import logger from "./config/logger.js";
import chalk from "chalk";

// Configuration constants from environment variables
const { port, env, appName } = envVars;
const httpServer = createServer(app);

/**
 * Initializes and starts the HTTP server with enhanced logging and error handling.
 * - Sets up database connection when server starts
 * - Configures graceful shutdown handlers
 * - Provides colorful console output for different environments
 *
 * @returns {import('http').Server} The running HTTP server instance
 */
function startServer() {
  const server = httpServer.listen(port);

  server.on("listening", () => {
    // Color-coded environment display
    const envColor = env === "production" ? chalk.redBright : chalk.greenBright;
    const envDisplay = envColor.bold(`[${env.toUpperCase()}]`);
    const appDisplay = chalk.blueBright.bold(appName || "Express App");
    const urlDisplay = chalk.cyanBright(`http://localhost:${port}`);
    const pidDisplay = chalk.yellowBright(process.pid);

    logger.info(`
      ${appDisplay} ${envDisplay}
      🚀 Server ready at ${urlDisplay}
      PID: ${pidDisplay}
    `);

    // Initialize database connection
    connectDB().catch((err) => {
      logger.error("Database connection failed:", err);
      process.exit(1);
    });
  });

  server.on("error", (error) => {
    // Handle specific startup errors
    if (error.code === "EADDRINUSE") {
      logger.error(`Port ${port} is already in use`);
      process.exit(1);
    }
    logger.error("Critical server startup error:", error);
    process.exit(1);
  });

  // Configure graceful shutdown handlers
  registerShutdownHooks(server);

  return server;
}

/**
 * Registers system signal handlers for graceful server shutdown.
 * - Handles SIGTERM (termination request)
 * - Handles SIGINT (interrupt signal, e.g., Ctrl+C)
 * - Provides timeout for forced shutdown if needed
 *
 * @param {import('http').Server} server - The HTTP server instance
 */
function registerShutdownHooks(server) {
  const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}: Beginning graceful shutdown...`);

    // Close server and exit process
    server.close(() => {
      logger.info("All connections closed - shutting down");
      process.exit(0);
    });

    // Force shutdown if server doesn't close within 5 seconds
    setTimeout(() => {
      logger.error("Could not close connections in time - forcing shutdown");
      process.exit(1);
    }, 5000).unref(); // Prevent timer from keeping process alive
  };

  // Register signal handlers
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

// Initialize and export server instance
const server = startServer();
export { server };
