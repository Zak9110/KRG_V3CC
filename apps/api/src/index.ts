import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import applicationsRoutes from './routes/applications';
import uploadRoutes from './routes/upload';
import otpRoutes from './routes/otp';
import assignmentsRoutes from './routes/assignments';
import statusRoutes from './routes/status';
import authRoutes from './routes/auth';
import checkpointRoutes from './routes/checkpoint';
import analyticsRoutes from './routes/analytics';
import watchlistRoutes from './routes/watchlist';
import autoAssignRoutes from './routes/auto-assign';
import { initializeStorage } from './services/storage';
import { validateEnv } from './config/env';
import { requestLogger, errorLogger, logInfo, logError } from './config/logger';

// Load and validate environment variables
dotenv.config();
const env = validateEnv();

const app = express();
const PORT = env.PORT || 3001;

// Security: Helmet middleware for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: env.NODE_ENV === 'production' 
    ? [env.FRONTEND_URL, 'https://krg-evisit.vercel.app'] 
    : ['http://localhost:3002', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit login attempts
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/otp/', authLimiter);

// Request logging
app.use(requestLogger);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/checkpoint', checkpointRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/auto-assign', autoAssignRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error logging middleware
app.use(errorLogger);

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logError('Unhandled error', err, { url: req.url, method: req.method });
  res.status(500).json({
    success: false,
    error: {
      message: env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
    },
  });
});

// Initialize storage bucket
initializeStorage().catch((error) => {
  logError('Storage initialization failed', error);
});

// Start server
app.listen(PORT, () => {
  logInfo(`🚀 API Server running on http://localhost:${PORT}`);
  logInfo(`📊 Health check: http://localhost:${PORT}/health`);
  logInfo(`📁 File upload: http://localhost:${PORT}/api/upload`);
  logInfo(`🔒 Security: Helmet, Rate Limiting, CORS enabled`);
  logInfo(`📝 Logging: Request and error logging active`);
  logInfo(`🌍 Environment: ${env.NODE_ENV}`);
});
