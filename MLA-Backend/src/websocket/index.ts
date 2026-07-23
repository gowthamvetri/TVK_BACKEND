/**
 * WebSocket (Socket.IO) Configuration
 *
 * Handles real-time communication for:
 * - Complaint status updates
 * - Live notifications
 * - Dashboard real-time data
 * - Announcement broadcasting
 *
 * Architecture:
 * - Currently uses in-memory adapter (single server)
 * - FUTURE UPGRADE: Add Redis adapter for multi-server scaling:
 *   const { createAdapter } = require('@socket.io/redis-adapter');
 */
import { Server, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import type { Server as HttpsServer } from 'https';
import jwt from 'jsonwebtoken';
import config from '../config';
import logger from '../shared/logger';
import notificationService from '../modules/notifications/notification.service';

type HttpServerLike = HttpServer | HttpsServer;

interface SocketUser {
  id: string;
  role: string;
  ward?: number;
  permissions?: string[];
}

type AuthSocket = Socket & { user: SocketUser };

let io: Server | undefined;

/**
 * Initialize Socket.IO server
 */
const initializeWebSocket = (httpServer: HttpServerLike) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin === '*' ? true : config.cors.origin.split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // === Authentication Middleware ===
  io.use((socket: Socket, next) => {
    const rawToken = socket.handshake.auth.token ?? socket.handshake.query.token;
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    if (typeof token !== 'string') {
      return next(new Error('Invalid token'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret) as {
        id: string;
        role: string;
        ward?: number;
        permissions?: string[];
      };
      (socket as AuthSocket).user = {
        id: decoded.id,
        role: decoded.role,
        ward: decoded.ward,
        permissions: decoded.permissions,
      };
      next();
    } catch (_error) {
      next(new Error('Invalid token'));
    }
  });

  // === Connection Handler ===
  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthSocket;
    const { id, role, ward } = authSocket.user;
    logger.info(`[WebSocket] User connected: ${id} (${role})`);

    // Join personal room for targeted notifications
    authSocket.join(`user:${id}`);

    // Join role-based room
    authSocket.join(`role:${role}`);

    // Join ward-based room
    if (ward) {
      authSocket.join(`ward:${ward}`);
    }

    // === Client Events ===

    // Track complaint (subscribe to updates)
    authSocket.on('track:complaint', (complaintId: string) => {
      authSocket.join(`complaint:${complaintId}`);
      logger.debug(`[WebSocket] User ${id} tracking complaint: ${complaintId}`);
    });

    // Untrack complaint
    authSocket.on('untrack:complaint', (complaintId: string) => {
      authSocket.leave(`complaint:${complaintId}`);
    });

    // Typing indicator (for future chat features)
    authSocket.on('typing', (data: { room: string; [key: string]: unknown }) => {
      authSocket.to(data.room).emit('typing', { userId: id, ...data });
    });

    // === Disconnect ===
    authSocket.on('disconnect', (reason: string) => {
      logger.debug(`[WebSocket] User disconnected: ${id} (${reason})`);
    });

    authSocket.on('error', (error: unknown) => {
      logger.error(`[WebSocket] Socket error for user ${id}:`, error);
    });
  });

  // Inject Socket.IO into notification service
  notificationService.setSocketIO(io);

  logger.info('[WebSocket] Socket.IO initialized');

  return io;
};

/**
 * Get the Socket.IO instance
 */
const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

/**
 * Emit event to a specific complaint room
 */
const emitToComplaint = (complaintId: string, event: string, data: unknown) => {
  if (io) {
    io.to(`complaint:${complaintId}`).emit(event, data);
  }
};

/**
 * Emit event to a specific ward room
 */
const emitToWard = (ward: number, event: string, data: unknown) => {
  if (io) {
    io.to(`ward:${ward}`).emit(event, data);
  }
};

/**
 * Broadcast to all connected users
 */
const broadcast = (event: string, data: unknown) => {
  if (io) {
    io.emit(event, data);
  }
};

export { initializeWebSocket, getIO, emitToComplaint, emitToWard, broadcast };
