/**
 * Cache Key Builder
 * Implements structured cache key naming convention
 * Ensures consistent, searchable, and organized cache keys
 */

import { createHash } from 'crypto';

export class CacheKeyBuilder {
  private static readonly SEPARATOR = ':';
  private static readonly VERSION = '1';

  /**
   * Build a cache key with consistent structure
   * Format: v{version}:{namespace}:{entity}:{id}:{filter}
   */
  static buildKey(
    namespace: string,
    entity: string,
    id?: string | number,
    filter?: string
  ): string {
    const parts = [
      `v${this.VERSION}`,
      namespace.toLowerCase(),
      entity.toLowerCase(),
      ...(id !== undefined && id !== null ? [String(id)] : []),
      ...(filter ? [this.hashFilter(filter)] : []),
    ];

    return parts.join(this.SEPARATOR);
  }

  /**
   * User related keys
   */
  static user = {
    byId: (userId: string | number) => this.buildKey('cache', 'user', userId),
    byEmail: (email: string) => this.buildKey('cache', 'user:email', this.hashFilter(email)),
    byPhone: (phone: string) => this.buildKey('cache', 'user:phone', this.hashFilter(phone)),
    profile: (userId: string | number) => this.buildKey('cache', 'user:profile', userId),
    roles: (userId: string | number) => this.buildKey('cache', 'user:roles', userId),
    permissions: (userId: string | number) =>
      this.buildKey('cache', 'user:permissions', userId),
    list: (page: number, limit: number) =>
      this.buildKey('cache', 'user:list', `page:${page}:limit:${limit}`),
    search: (query: string) => this.buildKey('cache', 'user:search', this.hashFilter(query)),
  };

  /**
   * Complaint related keys
   */
  static complaint = {
    byId: (complaintId: string | number) =>
      this.buildKey('cache', 'complaint', complaintId),
    detail: (complaintId: string | number) =>
      this.buildKey('cache', 'complaint:detail', complaintId),
    status: (complaintId: string | number) =>
      this.buildKey('cache', 'complaint:status', complaintId),
    history: (complaintId: string | number) =>
      this.buildKey('cache', 'complaint:history', complaintId),
    list: (page: number, limit: number) =>
      this.buildKey('cache', 'complaint:list', `page:${page}:limit:${limit}`),
    listByUser: (userId: string | number, page: number) =>
      this.buildKey('cache', 'complaint:user', userId, `page:${page}`),
    listByStatus: (status: string, page: number) =>
      this.buildKey('cache', 'complaint:status:list', this.hashFilter(status), `page:${page}`),
    listByDepartment: (deptId: string | number, page: number) =>
      this.buildKey('cache', 'complaint:dept', deptId, `page:${page}`),
    search: (query: string, page: number) =>
      this.buildKey('cache', 'complaint:search', this.hashFilter(query), `page:${page}`),
    stats: (complaintId: string | number) =>
      this.buildKey('cache', 'complaint:stats', complaintId),
    analytics: (period: string) =>
      this.buildKey('cache', 'complaint:analytics', this.hashFilter(period)),
  };

  /**
   * Dashboard related keys
   */
  static dashboard = {
    summary: (userId: string | number) =>
      this.buildKey('cache', 'dashboard:summary', userId),
    stats: (period: string) =>
      this.buildKey('cache', 'dashboard:stats', this.hashFilter(period)),
    overview: () => this.buildKey('cache', 'dashboard:overview'),
    metrics: (metric: string) =>
      this.buildKey('cache', 'dashboard:metrics', this.hashFilter(metric)),
  };

  /**
   * Announcement related keys
   */
  static announcement = {
    byId: (announcementId: string | number) =>
      this.buildKey('cache', 'announcement', announcementId),
    list: (page: number, limit: number) =>
      this.buildKey('cache', 'announcement:list', `page:${page}:limit:${limit}`),
    listByDepartment: (deptId: string | number) =>
      this.buildKey('cache', 'announcement:dept', deptId),
    active: () => this.buildKey('cache', 'announcement:active'),
  };

  /**
   * Scheme related keys
   */
  static scheme = {
    byId: (schemeId: string | number) => this.buildKey('cache', 'scheme', schemeId),
    list: (page: number, limit: number) =>
      this.buildKey('cache', 'scheme:list', `page:${page}:limit:${limit}`),
    listByCategory: (category: string, page: number) =>
      this.buildKey('cache', 'scheme:category', this.hashFilter(category), `page:${page}`),
    search: (query: string) => this.buildKey('cache', 'scheme:search', this.hashFilter(query)),
  };

  /**
   * Assignment related keys
   */
  static assignment = {
    byId: (assignmentId: string | number) =>
      this.buildKey('cache', 'assignment', assignmentId),
    byComplaint: (complaintId: string | number) =>
      this.buildKey('cache', 'assignment:complaint', complaintId),
    byOfficer: (officerId: string | number) =>
      this.buildKey('cache', 'assignment:officer', officerId),
    list: (page: number, limit: number) =>
      this.buildKey('cache', 'assignment:list', `page:${page}:limit:${limit}`),
  };

  /**
   * Escalation related keys
   */
  static escalation = {
    byId: (escalationId: string | number) =>
      this.buildKey('cache', 'escalation', escalationId),
    byComplaint: (complaintId: string | number) =>
      this.buildKey('cache', 'escalation:complaint', complaintId),
    list: (page: number, limit: number) =>
      this.buildKey('cache', 'escalation:list', `page:${page}:limit:${limit}`),
    pending: () => this.buildKey('cache', 'escalation:pending'),
  };

  /**
   * Notification related keys
   */
  static notification = {
    byId: (notificationId: string | number) =>
      this.buildKey('cache', 'notification', notificationId),
    byUser: (userId: string | number) =>
      this.buildKey('cache', 'notification:user', userId),
    unread: (userId: string | number) =>
      this.buildKey('cache', 'notification:unread', userId),
  };

  /**
   * Feedback related keys
   */
  static feedback = {
    byId: (feedbackId: string | number) =>
      this.buildKey('cache', 'feedback', feedbackId),
    byComplaint: (complaintId: string | number) =>
      this.buildKey('cache', 'feedback:complaint', complaintId),
    list: (page: number, limit: number) =>
      this.buildKey('cache', 'feedback:list', `page:${page}:limit:${limit}`),
  };

  /**
   * Configuration/System related keys
   */
  static system = {
    config: (key: string) => this.buildKey('cache', 'system:config', this.hashFilter(key)),
    settings: () => this.buildKey('cache', 'system:settings'),
    departments: () => this.buildKey('cache', 'system:departments'),
    roles: () => this.buildKey('cache', 'system:roles'),
    permissions: () => this.buildKey('cache', 'system:permissions'),
  };

  /**
   * Session related keys
   */
  static session = {
    byToken: (token: string) => this.buildKey('cache', 'session:token', this.hashFilter(token)),
    byUserId: (userId: string | number) =>
      this.buildKey('cache', 'session:user', userId),
    otp: (identifier: string) => this.buildKey('cache', 'otp', this.hashFilter(identifier)),
  };

  /**
   * Report related keys
   */
  static report = {
    byId: (reportId: string | number) => this.buildKey('cache', 'report', reportId),
    list: (page: number, limit: number) =>
      this.buildKey('cache', 'report:list', `page:${page}:limit:${limit}`),
    summary: (period: string) =>
      this.buildKey('cache', 'report:summary', this.hashFilter(period)),
  };

  /**
   * Create a pattern for key matching
   * Useful for invalidating multiple related keys
   */
  static pattern = {
    user: (userId?: string | number) =>
      userId ? `v${this.VERSION}:cache:user:${userId}:*` : `v${this.VERSION}:cache:user:*`,
    complaint: (complaintId?: string | number) =>
      complaintId
        ? `v${this.VERSION}:cache:complaint*:${complaintId}:*`
        : `v${this.VERSION}:cache:complaint*:*`,
    dashboard: () => `v${this.VERSION}:cache:dashboard*`,
    all: () => `v${this.VERSION}:*`,
  };

  /**
   * Hash a filter string to keep cache keys from becoming too long
   * SHA-256 hash truncated to 8 characters
   */
  private static hashFilter(value: string): string {
    if (value.length <= 20) {
      return value;
    }

    const hash = createHash('sha256').update(value).digest('hex');
    return hash.substring(0, 8);
  }

  /**
   * Generate a cache key from a query object (useful for API queries)
   */
  static generateQueryKey(entity: string, query: Record<string, any>): string {
    const queryString = JSON.stringify(query);
    return this.buildKey('cache', `query:${entity}`, this.hashFilter(queryString));
  }

  /**
   * Extract namespace from cache key
   */
  static extractNamespace(key: string): string {
    const parts = key.split(this.SEPARATOR);
    return parts[1] || '';
  }

  /**
   * Extract entity from cache key
   */
  static extractEntity(key: string): string {
    const parts = key.split(this.SEPARATOR);
    return parts[2] || '';
  }

  /**
   * Check if a key matches a pattern
   */
  static matches(key: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${regexPattern}$`).test(key);
  }
}

export default CacheKeyBuilder;
