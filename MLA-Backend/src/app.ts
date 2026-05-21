/**
 * ======================================================
 * MLA-Backend - Enterprise Smart Grievance Management
 * & Public Service Monitoring System
 * ======================================================
 *
 * Architecture: Modular Monolith (DDD + Service/Repository Pattern)
 * Stack: Node.js, Express, MongoDB Atlas, Socket.IO
 *
 * This is the application entry point. It:
 * 1. Loads configuration
 * 2. Connects to MongoDB
 * 3. Configures Express middleware
 * 4. Mounts all module routes
 * 5. Initializes WebSocket
 * 6. Starts background workers
 * 7. Registers event subscribers
 */

import express, { Request, Response } from 'express';
import http from 'http';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import fs from 'fs';

// === Config & Infrastructure ===
import config from './config';
import connectDB from './database/connection';
import logger from './shared/logger';
import swaggerSpec from './config/swagger';

// === Security Middleware ===
import {
  helmetMiddleware,
  corsMiddleware,
  apiLimiter,
  mongoSanitizeMiddleware,
  hppMiddleware,
} from './shared/security';

// === Error Handler ===
import errorHandler from './shared/middlewares/errorHandler';

// === Module Routes ===
import authRoutes from './modules/auth/routes';
import userRoutes from './modules/users/routes';
import complaintRoutes from './modules/complaints/routes';
import assignmentRoutes from './modules/assignments/routes';
import escalationRoutes from './modules/escalations/routes';
import notificationRoutes from './modules/notifications/routes';
import announcementRoutes from './modules/announcements/routes';
import schemeRoutes from './modules/schemes/routes';
import analyticsRoutes from './modules/analytics/routes';
import reportRoutes from './modules/reports/routes';
import dashboardRoutes from './modules/dashboard/routes';
import uploadRoutes from './modules/uploads/routes';
import feedbackRoutes from './modules/feedback/routes';
import officialRoutes from './modules/officials/routes';

// === WebSocket & Workers ===
import { initializeWebSocket } from './websocket';
import startWorkers from './workers';
import registerEventSubscribers from './modules/notifications/eventSubscribers';
import { start as startSlaEngine } from './modules/complaints/sla.engine';

// ======================================================
// APPLICATION SETUP
// ======================================================

const app = express();
const server = http.createServer(app);

// === Ensure uploads directory exists ===
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// === Global Middleware ===
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitizeMiddleware);
app.use(hppMiddleware);

// Request logging
if (config.app.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

// Rate limiting on API routes
app.use(`/api/${config.app.apiVersion}`, apiLimiter);

// === Health Check ===
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'MLA Grievance System API is running',
    environment: config.app.env,
    timestamp: new Date().toISOString(),
  });
});

// === API Documentation ===
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MLA Grievance API Docs',
}));

// === API Routes ===
const apiBase = `/api/${config.app.apiVersion}`;

app.use(`${apiBase}/auth`, authRoutes);
app.use(`${apiBase}/users`, userRoutes);
app.use(`${apiBase}/complaints`, complaintRoutes);
app.use(`${apiBase}/assignments`, assignmentRoutes);
app.use(`${apiBase}/escalations`, escalationRoutes);
app.use(`${apiBase}/notifications`, notificationRoutes);
app.use(`${apiBase}/announcements`, announcementRoutes);
app.use(`${apiBase}/schemes`, schemeRoutes);
app.use(`${apiBase}/analytics`, analyticsRoutes);
app.use(`${apiBase}/reports`, reportRoutes);
app.use(`${apiBase}/dashboard`, dashboardRoutes);
app.use(`${apiBase}/uploads`, uploadRoutes);
app.use(`${apiBase}/feedback`, feedbackRoutes);
app.use(`${apiBase}/officials`, officialRoutes);

// === 404 Handler ===
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    errorCode: 'ROUTE_NOT_FOUND',
  });
});

// === Global Error Handler ===
app.use(errorHandler);

// ======================================================
// SERVER STARTUP
// ======================================================

async function startServer() {
  try {
    // 1. Connect to MongoDB
    // ======================================================
    // MLA-Backend - Enterprise Smart Grievance Management
    // & Public Service Monitoring System
    // ======================================================
    await connectDB();

    // 2. Initialize WebSocket
    initializeWebSocket(server);

    // 3. Register event subscribers (connects events to notifications)
    registerEventSubscribers();

    // 4. Start SLA monitoring engine
    startSlaEngine();

    // 5. Start background workers
    startWorkers();

    // 6. Start HTTP server
    server.listen(config.app.port, () => {
      logger.info('');
      logger.info(` ${config.app.name} started successfully`);
      logger.info(` Server:     http://localhost:${config.app.port}`);
      logger.info(` API Docs:   http://localhost:${config.app.port}/api-docs`);
      logger.info(` API Base:   http://localhost:${config.app.port}${apiBase}`);
      logger.info(`
 Environment: ${config.app.env}`);
      logger.info('');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// === Unhandled Rejection & Exception Handlers ===
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();

export default app;
