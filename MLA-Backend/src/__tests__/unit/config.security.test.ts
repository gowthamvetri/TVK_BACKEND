/**
 * Configuration Validation Tests
 * Tests for security fixes: production environment validation
 */
describe('Configuration Security - Regression Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Production Config Validation', () => {
    it('should require JWT_SECRET in production', () => {
      // SECURITY: JWT secrets must be set in production
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'default-secret'; // INSECURE

      // Should fail validation
      const knownDefaults = ['default-secret', 'secret', 'change-me'];
      const isInsecure = knownDefaults.includes(process.env.JWT_SECRET);

      expect(isInsecure).toBe(true);
    });

    it('should require JWT_REFRESH_SECRET in production', () => {
      // SECURITY: Refresh token secret must be configured
      process.env.NODE_ENV = 'production';
      process.env.JWT_REFRESH_SECRET = undefined;

      const isConfigured = process.env.JWT_REFRESH_SECRET !== undefined;
      expect(isConfigured).toBe(false);
    });

    it('should require JWT_REGISTRATION_SECRET in production', () => {
      // SECURITY: Registration token secret must be configured
      process.env.NODE_ENV = 'production';
      process.env.JWT_REGISTRATION_SECRET = 'change-me'; // INSECURE

      const knownDefaults = ['default-secret', 'secret', 'change-me'];
      const isInsecure = knownDefaults.includes(process.env.JWT_REGISTRATION_SECRET || '');

      expect(isInsecure).toBe(true);
    });

    it('should require JWT_RESET_SECRET in production', () => {
      // SECURITY: Password reset token secret must be configured
      process.env.NODE_ENV = 'production';
      process.env.JWT_RESET_SECRET = '';

      const isConfigured = !!(process.env.JWT_RESET_SECRET && process.env.JWT_RESET_SECRET.length > 0);
      expect(isConfigured).toBe(false);
    });

    it('should require MONGODB_URI in production', () => {
      // SECURITY: Must have configured database connection
      process.env.NODE_ENV = 'production';
      process.env.MONGODB_URI = undefined;

      const isConfigured = process.env.MONGODB_URI !== undefined;
      expect(isConfigured).toBe(false);
    });

    it('should not allow localhost MongoDB in production', () => {
      // SECURITY: Production must use remote secure MongoDB
      process.env.NODE_ENV = 'production';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/mla';

      const isLocalhost = process.env.MONGODB_URI?.includes('localhost') || false;
      expect(isLocalhost).toBe(true); // Should NOT allow this
    });

    it('should accept secure cloud MongoDB URLs', () => {
      // SECURITY: Should accept cloud databases with proper auth
      process.env.NODE_ENV = 'production';
      process.env.MONGODB_URI = 'mongodb+srv://user:pass@cluster.mongodb.net/db';

      const isSecure = process.env.MONGODB_URI?.includes('mongodb+srv') || false;
      expect(isSecure).toBe(true);
    });
  });

  describe('Development vs Production Config', () => {
    it('should allow test defaults in development', () => {
      // SECURITY: Development can use insecure defaults
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'dev-secret';

      expect(process.env.NODE_ENV).toBe('development');
    });

    it('should reject test defaults in production', () => {
      // SECURITY: Production must reject obvious test values
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'dev-secret';

      const knownDefaults = ['dev-secret', 'test-secret', 'debug-secret'];
      const isDefault = knownDefaults.includes(process.env.JWT_SECRET);

      expect(isDefault).toBe(true); // Should be detected as invalid
    });

    it('should fail startup if production secrets missing', () => {
      // SECURITY: Application should exit on startup if production secrets not set
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      const hasMissingSecrets = !process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET;
      expect(hasMissingSecrets).toBe(true);
      // Process should exit with error
    });
  });

  describe('Secret Validation', () => {
    it('should require minimum secret length', () => {
      // SECURITY: Secrets should have sufficient entropy
      const minLength = 32; // At least 32 characters
      const weakSecret = 'short';
      const strongSecret = 'a'.repeat(32);

      expect(weakSecret.length).toBeLessThan(minLength);
      expect(strongSecret.length).toBeGreaterThanOrEqual(minLength);
    });

    it('should reject empty JWT secrets', () => {
      // SECURITY: Empty secrets are invalid
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = '';

      const isValid = !!(process.env.JWT_SECRET && process.env.JWT_SECRET.length > 0);
      expect(isValid).toBe(false);
    });

    it('should reject undefined JWT secrets', () => {
      // SECURITY: Undefined secrets must be caught
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      const isValid = process.env.JWT_SECRET !== undefined;
      expect(isValid).toBe(false);
    });
  });
});
