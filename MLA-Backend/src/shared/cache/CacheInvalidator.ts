/**
 * Cache Invalidator
 * Handles cache invalidation on data updates/deletes
 * Prevents stale cache issues
 */

import logger from '../logger';
import { cacheService } from './CacheService';
import { CacheKeyBuilder } from './CacheKeyBuilder';
import { CacheInvalidationEvent } from './types';

export class CacheInvalidator {
  private invalidationCallbacks: ((event: CacheInvalidationEvent) => void)[] = [];

  /**
   * Invalidate single cache key
   */
  async invalidateKey(key: string, reason: string = 'data_updated'): Promise<void> {
    try {
      const deleted = await cacheService.delete(key);

      if (deleted) {
        logger.debug('Cache key invalidated', { key, reason });
      }

      this.emitEvent({
        keys: [key],
        reason,
        entity: CacheKeyBuilder.extractEntity(key),
        action: 'update',
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Error invalidating cache key', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Invalidate multiple related cache keys
   */
  async invalidateKeys(keys: string[], reason: string = 'data_updated'): Promise<void> {
    try {
      for (const key of keys) {
        await cacheService.delete(key);
      }

      logger.debug('Cache keys invalidated', { count: keys.length, reason });

      this.emitEvent({
        keys,
        reason,
        entity: keys.length > 0 ? CacheKeyBuilder.extractEntity(keys[0]) : 'unknown',
        action: 'update',
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Error invalidating cache keys', {
        count: keys.length,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Invalidate cache by pattern (e.g., all user:{id}:* entries)
   */
  async invalidatePattern(pattern: string, reason: string = 'pattern_invalidation'): Promise<number> {
    try {
      const deletedCount = await cacheService.deletePattern(pattern);

      if (deletedCount > 0) {
        logger.debug('Cache pattern invalidated', { pattern, deletedCount, reason });

        this.emitEvent({
          keys: [pattern],
          reason,
          entity: CacheKeyBuilder.extractEntity(pattern),
          action: 'delete',
          timestamp: Date.now(),
        });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Error invalidating cache pattern', {
        pattern,
        error: error instanceof Error ? error.message : String(error),
      });

      return 0;
    }
  }

  /**
   * Invalidate all user-related cache
   */
  async invalidateUser(userId: string | number, reason: string = 'user_updated'): Promise<void> {
    const keysToInvalidate = [
      CacheKeyBuilder.user.byId(userId),
      CacheKeyBuilder.user.profile(userId),
      CacheKeyBuilder.user.roles(userId),
      CacheKeyBuilder.user.permissions(userId),
    ];

    await this.invalidateKeys(keysToInvalidate, reason);

    // Also invalidate session
    const pattern = CacheKeyBuilder.pattern.user(userId);
    await this.invalidatePattern(pattern, reason);
  }

  /**
   * Invalidate all complaint-related cache
   */
  async invalidateComplaint(
    complaintId: string | number,
    reason: string = 'complaint_updated'
  ): Promise<void> {
    const keysToInvalidate = [
      CacheKeyBuilder.complaint.byId(complaintId),
      CacheKeyBuilder.complaint.detail(complaintId),
      CacheKeyBuilder.complaint.status(complaintId),
      CacheKeyBuilder.complaint.history(complaintId),
      CacheKeyBuilder.complaint.stats(complaintId),
    ];

    await this.invalidateKeys(keysToInvalidate, reason);

    // Invalidate related lists (since complaint list might have changed)
    const pattern = `v1:cache:complaint*:list:*`;
    await this.invalidatePattern(pattern, `${reason}:list_affected`);

    // Invalidate dashboard caches
    const dashboardPattern = CacheKeyBuilder.pattern.dashboard();
    await this.invalidatePattern(dashboardPattern, `${reason}:dashboard_affected`);
  }

  /**
   * Invalidate all complaints by a user (for user updates affecting their complaints)
   */
  async invalidateUserComplaints(
    userId: string | number,
    reason: string = 'user_updated'
  ): Promise<void> {
    const pattern = `v1:cache:complaint:user:${userId}:*`;
    await this.invalidatePattern(pattern, reason);
  }

  /**
   * Invalidate all complaints by department
   */
  async invalidateDepartmentComplaints(
    deptId: string | number,
    reason: string = 'department_updated'
  ): Promise<void> {
    const pattern = `v1:cache:complaint:dept:${deptId}:*`;
    await this.invalidatePattern(pattern, reason);
  }

  /**
   * Invalidate complaint analytics
   */
  async invalidateComplaintAnalytics(
    period?: string,
    reason: string = 'analytics_updated'
  ): Promise<void> {
    if (period) {
      const key = CacheKeyBuilder.complaint.analytics(period);
      await this.invalidateKey(key, reason);
    } else {
      const pattern = `v1:cache:complaint:analytics:*`;
      await this.invalidatePattern(pattern, reason);
    }
  }

  /**
   * Invalidate all announcement cache
   */
  async invalidateAnnouncement(
    announcementId: string | number,
    reason: string = 'announcement_updated'
  ): Promise<void> {
    const keysToInvalidate = [
      CacheKeyBuilder.announcement.byId(announcementId),
      CacheKeyBuilder.announcement.list(1, 10), // Note: This is approximate
    ];

    await this.invalidateKeys(keysToInvalidate, reason);

    // Invalidate all announcement lists
    const pattern = `v1:cache:announcement:*`;
    await this.invalidatePattern(pattern, reason);
  }

  /**
   * Invalidate all scheme cache
   */
  async invalidateScheme(schemeId: string | number, reason: string = 'scheme_updated'): Promise<void> {
    const keysToInvalidate = [
      CacheKeyBuilder.scheme.byId(schemeId),
    ];

    await this.invalidateKeys(keysToInvalidate, reason);

    // Invalidate all scheme lists
    const pattern = `v1:cache:scheme:*`;
    await this.invalidatePattern(pattern, reason);
  }

  /**
   * Invalidate assignment cache
   */
  async invalidateAssignment(
    assignmentId: string | number,
    complaintId?: string | number,
    reason: string = 'assignment_updated'
  ): Promise<void> {
    const keysToInvalidate = [
      CacheKeyBuilder.assignment.byId(assignmentId),
    ];

    if (complaintId) {
      keysToInvalidate.push(CacheKeyBuilder.assignment.byComplaint(complaintId));
    }

    await this.invalidateKeys(keysToInvalidate, reason);
  }

  /**
   * Invalidate escalation cache
   */
  async invalidateEscalation(
    escalationId: string | number,
    complaintId?: string | number,
    reason: string = 'escalation_updated'
  ): Promise<void> {
    const keysToInvalidate = [
      CacheKeyBuilder.escalation.byId(escalationId),
    ];

    if (complaintId) {
      keysToInvalidate.push(CacheKeyBuilder.escalation.byComplaint(complaintId));
    }

    // Also invalidate escalation lists
    const pattern = `v1:cache:escalation:*`;
    await this.invalidatePattern(pattern, reason);

    await this.invalidateKeys(keysToInvalidate, reason);
  }

  /**
   * Invalidate feedback cache
   */
  async invalidateFeedback(
    feedbackId: string | number,
    complaintId?: string | number,
    reason: string = 'feedback_updated'
  ): Promise<void> {
    const keysToInvalidate = [
      CacheKeyBuilder.feedback.byId(feedbackId),
    ];

    if (complaintId) {
      keysToInvalidate.push(CacheKeyBuilder.feedback.byComplaint(complaintId));
    }

    await this.invalidateKeys(keysToInvalidate, reason);
  }

  /**
   * Invalidate dashboard cache
   */
  async invalidateDashboard(userId?: string | number, reason: string = 'data_updated'): Promise<void> {
    if (userId) {
      const key = CacheKeyBuilder.dashboard.summary(userId);
      await this.invalidateKey(key, reason);
    } else {
      const pattern = CacheKeyBuilder.pattern.dashboard();
      await this.invalidatePattern(pattern, reason);
    }
  }

  /**
   * Invalidate notification cache
   */
  async invalidateNotification(
    userId: string | number,
    reason: string = 'notification_updated'
  ): Promise<void> {
    const keysToInvalidate = [
      CacheKeyBuilder.notification.byUser(userId),
      CacheKeyBuilder.notification.unread(userId),
    ];

    await this.invalidateKeys(keysToInvalidate, reason);
  }

  /**
   * Invalidate all system/config cache
   */
  async invalidateSystem(reason: string = 'system_config_updated'): Promise<void> {
    const pattern = `v1:cache:system:*`;
    await this.invalidatePattern(pattern, reason);
  }

  /**
   * Invalidate session/OTP cache
   */
  async invalidateSession(
    identifier: string,
    reason: string = 'session_invalidated'
  ): Promise<void> {
    const key = CacheKeyBuilder.session.byToken(identifier);
    await this.invalidateKey(key, reason);
  }

  /**
   * Bulk invalidation for multiple entities
   */
  async invalidateBulk(
    entities: Array<{ type: string; id: string | number }>,
    reason: string = 'bulk_invalidation'
  ): Promise<void> {
    const allKeys: string[] = [];

    for (const entity of entities) {
      switch (entity.type) {
        case 'user':
          allKeys.push(CacheKeyBuilder.user.byId(entity.id));
          break;
        case 'complaint':
          allKeys.push(CacheKeyBuilder.complaint.byId(entity.id));
          break;
        case 'announcement':
          allKeys.push(CacheKeyBuilder.announcement.byId(entity.id));
          break;
        case 'scheme':
          allKeys.push(CacheKeyBuilder.scheme.byId(entity.id));
          break;
        // Add more entity types as needed
      }
    }

    if (allKeys.length > 0) {
      await this.invalidateKeys(allKeys, reason);
    }

    this.emitEvent({
      keys: allKeys,
      reason,
      entity: 'bulk',
      action: 'bulk',
      timestamp: Date.now(),
    });
  }

  /**
   * Register callback for invalidation events
   */
  onInvalidation(callback: (event: CacheInvalidationEvent) => void): void {
    this.invalidationCallbacks.push(callback);
  }

  /**
   * Emit invalidation event
   */
  private emitEvent(event: CacheInvalidationEvent): void {
    this.invalidationCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        logger.error('Error in invalidation callback', { error: err });
      }
    });
  }

  /**
   * Clear all cache (careful with this!)
   */
  async clearAll(reason: string = 'manual_clear'): Promise<void> {
    await cacheService.clear();

    logger.warn('Complete cache cleared', { reason });

    this.emitEvent({
      keys: ['*'],
      reason,
      entity: 'all',
      action: 'delete',
      timestamp: Date.now(),
    });
  }
}

// Singleton instance
export const cacheInvalidator = new CacheInvalidator();

export default cacheInvalidator;
