import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import methodOverride from "method-override";
import morgan from "morgan";
import { applyErrorMiddleware } from "../helpers/error-handler.js";
import envVars from "./env-vars.js";

/**
 * Express Application Configuration Module
 *
 * Configures and initializes an Express application with security, performance,
 * and utility middleware in optimal order. Follows security best practices while
 * maintaining flexibility for different environments.
 *
 * Middleware ordering follows this sequence:
 * 1. Security-critical middleware
 * 2. Request processing middleware
 * 3. Performance optimization
 * 4. Development & monitoring tools
 * 5. Error handling
 *
 * @module appConfig
 * @returns {express.Application} Configured Express application instance
 */

const app = express();

// =================================
// 1. SECURITY MIDDLEWARE (FIRST)
// =================================

/**
 * Trust Proxy Configuration
 *
 * Enable when behind a reverse proxy in production to:
 * - Get real client IP through X-Forwarded-For header
 * - Ensure secure cookies work properly
 * - Correctly interpret X-Forwarded-Proto
 */
if (envVars.env === "production") {
  app.enable("trust proxy");
}

/**
 * Helmet Security Headers
 *
 * Sets various HTTP headers for security protection including:
 * - Content Security Policy (CSP) to prevent XSS
 * - Strict Transport Security (HSTS) for HTTPS enforcement
 * - XSS protection
 * - MIME-type sniffing prevention
 * - Referrer policy control
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
      },
    },
    hsts: {
      maxAge: 63072000, // 2 years in seconds
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "same-origin" },
  })
);

/**
 * Rate Limiting Middleware
 *
 * Protects against brute force and DDoS attacks by limiting:
 * - 100 requests per 15 minutes in production
 * - 1000 requests per 15 minutes in development
 *
 * Exclusions:
 * - Health check endpoints
 * - Metrics endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: envVars.env === "production" ? 100 : 1000,
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.includes("healthcheck") || req.path.includes("metrics"),
});

app.use(apiLimiter);

/**
 * CORS Configuration
 *
 * Configures Cross-Origin Resource Sharing with:
 * - Dynamic origin validation against allowed list
 * - Credential support for authenticated requests
 * - Preflight caching for 24 hours
 * - Strict headers and methods control
 */
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Allow non-browser requests

    const allowedOrigins = [
      ...(envVars.corsOrigins || "").split(","),
      "http://localhost:3000",
      "https://askastudent.net",
      "https://dev.askastudent.net",
    ].filter(Boolean);

    if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "X-CSRF-Token",
    "X-Forwarded-For",
  ],
  exposedHeaders: [
    "Content-Length",
    "X-Request-ID",
    "RateLimit-Limit",
    "RateLimit-Remaining",
    "RateLimit-Reset",
  ],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// =================================
// 2. REQUEST PROCESSING MIDDLEWARE
// =================================

/**
 * JSON Body Parser
 *
 * Parses incoming JSON payloads with:
 * - 10kb size limit to prevent large payload attacks
 * - Strict mode for RFC compliance
 * - Content-type validation
 * - Manual JSON verification for early rejection
 */
app.use(
  express.json({
    limit: "10kb",
    strict: true,
    type: ["application/json", "application/vnd.api+json"],
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf.toString());
      } catch {
        throw new Error("Invalid JSON payload");
      }
    },
  })
);

/**
 * URL-Encoded Body Parser
 *
 * Parses traditional form data with:
 * - Extended syntax for rich objects/arrays
 * - 10kb size limit
 * - Reduced parameter limit (50) for security
 */
app.use(
  express.urlencoded({
    extended: true,
    limit: "10kb",
    parameterLimit: 50,
    type: "application/x-www-form-urlencoded",
  })
);

/**
 * Cookie Parser Middleware
 *
 * Configures secure cookie handling with:
 * - HTTP-only flag to prevent XSS access
 * - Secure flag in production (HTTPS only)
 * - Strict SameSite policy in production
 * - 1 day expiration
 * - Signed cookies for tamper protection
 */
app.use(
  cookieParser(envVars.cookieSecret, {
    httpOnly: true,
    secure: envVars.env === "production",
    sameSite: envVars.env === "production" ? "strict" : "lax",
    maxAge: 86400000, // 1 day
    path: "/",
    domain: envVars.cookieDomain || undefined,
    signed: true,
  })
);

/**
 * Method Override Middleware
 *
 * Supports legacy clients by allowing:
 * - HTTP header override (X-HTTP-Method-Override)
 * - Query parameter override (_method)
 * - Body parameter override (_method)
 */
app.use(methodOverride("X-HTTP-Method-Override"));
app.use(methodOverride("_method"));
app.use(
  methodOverride((req) => {
    if (req.body && typeof req.body === "object" && "_method" in req.body) {
      const method = req.body._method;
      delete req.body._method;
      return method;
    }
  })
);

// =================================
// 3. PERFORMANCE OPTIMIZATION
// =================================

/**
 * Compression Middleware
 *
 * Optimizes response sizes with:
 * - 1kb threshold for compression
 * - Level 6 compression (good balance)
 * - Exclusion for health checks and metrics
 * - 16KB chunk size for streaming
 */
app.use(
  compression({
    threshold: 1024,
    level: 6,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      if (req.path.includes("healthcheck")) return false;
      if (req.path.includes("metrics")) return false;
      return compression.filter(req, res);
    },
    chunkSize: 16384, // 16KB chunks
  })
);

// =================================
// 4. DEVELOPMENT & MONITORING
// =================================

/**
 * Request Logging
 *
 * Uses Morgan for HTTP request logging:
 * - Disabled in test environment
 * - Configurable format via envVars
 * - Custom configuration possible
 */
if (envVars.env !== "test") {
  app.use(morgan(envVars.logFormat, envVars.morganConfig));
}

// =================================
// 5. ERROR HANDLING (LAST)
// =================================

/**
 * Applies centralized error handling middleware
 * - Must be added after all other middleware
 * - Handles both operational and programmer errors
 * - Provides structured error responses
 */
applyErrorMiddleware(app);

export default app;
