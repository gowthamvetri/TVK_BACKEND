/**
 * Very early environment setup for Jest
 * This runs before ANY test or app code is loaded
 * Ensures NODE_ENV is set to 'test' before app.ts is imported
 */

process.env.NODE_ENV = 'test';
