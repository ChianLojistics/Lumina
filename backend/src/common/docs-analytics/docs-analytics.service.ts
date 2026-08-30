import { Injectable, Logger } from '@nestjs/common';

interface DocViewEvent {
  page: string;
  userId?: string;
  timestamp: Date;
  userAgent?: string;
}

/**
 * Tracks documentation page views for usage analytics.
 *
 * This service is intentionally lightweight — it logs events for
 * external analytics pipelines (e.g. Prometheus, PostHog) rather than
 * maintaining its own database table. The in-memory buffer is suitable
 * for development; production deployments should export to a metrics
 * backend via the tracing/metrics pipeline.
 */
@Injectable()
export class DocsAnalyticsService {
  private readonly logger = new Logger(DocsAnalyticsService.name);
  private readonly recentViews: DocViewEvent[] = [];
  private readonly MAX_BUFFER = 1_000;

  /**
   * Record a documentation page view.
   */
  trackDocView(page: string, userId?: string, userAgent?: string): void {
    const event: DocViewEvent = {
      page,
      userId: userId || 'anonymous',
      timestamp: new Date(),
      userAgent,
    };

    this.recentViews.push(event);
    if (this.recentViews.length > this.MAX_BUFFER) {
      this.recentViews.shift();
    }

    this.logger.debug(`Doc view: ${page} by ${event.userId}`);
  }

  /**
   * Get the most popular documentation pages.
   */
  getPopularPages(limit: number = 10): Array<{ page: string; views: number }> {
    const counts = new Map<string, number>();
    for (const event of this.recentViews) {
      counts.set(event.page, (counts.get(event.page) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  /**
   * Get documentation usage summary.
   */
  getSummary(): {
    totalViews: number;
    uniquePages: number;
    uniqueUsers: number;
    recentViews: number;
  } {
    const pages = new Set(this.recentViews.map((e) => e.page));
    const users = new Set(this.recentViews.map((e) => e.userId));
    const oneHourAgo = Date.now() - 3600_000;
    const recent = this.recentViews.filter(
      (e) => e.timestamp.getTime() > oneHourAgo,
    );

    return {
      totalViews: this.recentViews.length,
      uniquePages: pages.size,
      uniqueUsers: users.size,
      recentViews: recent.length,
    };
  }

  /**
   * Clear the analytics buffer (for testing).
   */
  clear(): void {
    this.recentViews.length = 0;
  }
}
