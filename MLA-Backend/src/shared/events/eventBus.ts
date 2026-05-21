/**
 * In-Process Event Bus
 *
 * Lightweight event-driven communication between modules.
 * Uses Node.js EventEmitter internally.
 *
 * FUTURE UPGRADE PATH:
 * Replace this with Redis Pub/Sub or RabbitMQ by implementing
 * the same interface (emit, on, off) backed by a message broker.
 */
import { EventEmitter } from 'events';
import logger from '../logger';

const emitter = new EventEmitter();
emitter.setMaxListeners(50);

type Handler = (...args: unknown[]) => void;

const emit = (event: string, payload?: unknown) => {
  logger.debug(`[EventBus] Emitting: ${event}`, {
    payload: typeof payload === 'object' ? JSON.stringify(payload).substring(0, 200) : payload,
  });
  return emitter.emit(event, payload);
};

const on = (event: string, handler: Handler) => {
  logger.debug(`[EventBus] Subscriber registered for: ${event}`);
  return emitter.on(event, handler);
};

const once = (event: string, handler: Handler) => emitter.once(event, handler);

const off = (event: string, handler: Handler) => emitter.off(event, handler);

const eventBus = { emit, on, once, off };

export default eventBus;
