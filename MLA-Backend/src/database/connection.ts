/**
 * MongoDB Connection Manager
 * Handles connection, reconnection, and graceful shutdown.
 */
import mongoose from 'mongoose';
import config from '../config';
import logger from '../shared/logger';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.db.uri, {
      maxPoolSize: 10, // Free-tier friendly pool size
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting reconnection...');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('MongoDB connection failed:', error.message);
    } else {
      logger.error('MongoDB connection failed:', error);
    }
    process.exit(1);
  }
};

export default connectDB;
