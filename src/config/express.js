import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';
import helmet from 'helmet'; // Added for security headers
import rateLimit from 'express-rate-limit'; // Added for rate limiting
import envVars from './env-vars.js';

/**
 * Core Express Application Configuration
 *
 * This module configures the Express application with essential middleware in optimal order:
 * 1. Security middleware (helmet, CORS, rate limiting)
 * 2. Request processing (body parsing, cookies, method override)
 * 3. Performance optimization (compression)
 * 4. Logging (development only)
 *
 * Best practices followed:
 * - Security headers automatically set via helmet
 * - Rate limiting to prevent brute force attacks
 * - Proper CORS configuration
 * - Body parsing with sensible limits
 * - Method override for legacy clients
 * - Compression for performance
 * - Environment-aware logging
 */

const app = express();

// ======================
// Security Middleware
// ======================

// Enable reverse proxy support for accurate IP addresses
app.enable('trust proxy');

// Set security HTTP headers using helmet
app.use(helmet());

// Configure rate limiting (100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable deprecated headers
  skip: (req) => req.path.includes('healthcheck'), // Skip health checks
});

app.use(limiter);

// Configure CORS with production-ready settings
const corsOptions = {
  origin: process.env.CORS_ORIGIN || true, // Reflect request origin by default
  credentials: true, // Required for cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-CSRF-Token',
    'X-Forwarded-For',
  ],
  maxAge: 86400, // 24-hour preflight cache
};

app.use(cors(corsOptions));

// ======================
// Request Processing Middleware
// ======================

// Parse JSON bodies with security considerations
app.use(
  express.json({
    limit: '10kb', // Prevent large payload attacks
    strict: true, // Only accept arrays/objects
    type: 'application/json', // Explicit content-type
  }),
);

// Parse URL-encoded bodies with extended support
app.use(
  express.urlencoded({
    extended: true,
    limit: '10kb',
    parameterLimit: 50, // More secure default than 50k
    type: 'application/x-www-form-urlencoded',
  }),
);

// Parse cookies with security options
app.use(
  cookieParser({
    httpOnly: true, // Prevent XSS
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax', // CSRF protection
  }),
);

// Method override for legacy clients
app.use(methodOverride('X-HTTP-Method-Override')); // Header-based
app.use(methodOverride('_method')); // Query string-based
app.use(
  methodOverride((req) => {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      const method = req.body._method;
      delete req.body._method;
      return method;
    }
  }),
); // Body-based

// ======================
// Performance Optimization
// ======================

// Enable compression with sensible defaults
const compressFilter = (req, res) => {
  if (req.headers['x-no-compression']) return false;
  if (req.path.includes('healthcheck')) return false;
  return compression.filter(req, res);
};

app.use(
  compression({
    filter: compressFilter,
    threshold: 1024, // Only compress responses > 1KB
    level: 6, // Balanced compression level (1-9)
  }),
);

// ======================
// Development Tools
// ======================

// HTTP request logging (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(envVars.logFormat, envVars.morganConfig));
}

export default app;

