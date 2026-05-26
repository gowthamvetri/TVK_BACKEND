/**
 * Jest Type Definitions
 * Extends Jest matchers with custom ones
 */

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}

export {};
