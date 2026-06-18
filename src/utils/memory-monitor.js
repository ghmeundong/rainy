/**
 * Memory Leak Detection and Performance Monitoring Utility
 * Monitor Three.js and DOM resource usage in real-time
 */

class MemoryMonitor {
  constructor() {
    this.snapshots = [];
    this.maxSnapshots = 60; // Keep 60 snapshots (≈ 1 minute at 1 sample/sec)
    this.isMonitoring = false;
    this.monitorInterval = null;
    this.thresholds = {
      geometries: 100,
      materials: 50,
      textures: 50,
      renderers: 5,
      workers: 5,
      observers: 20,
      listeners: 100,
    };
  }

  /**
   * Take a snapshot of current resource counts
   */
  takeSnapshot(resourceCounts) {
    const snapshot = {
      timestamp: Date.now(),
      ...resourceCounts,
      gcManager: typeof window.getGCStats === 'function' ? window.getGCStats() : null,
    };

    this.snapshots.push(snapshot);

    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Analyze trend in resource usage
   */
  analyzeTrend(metric) {
    if (this.snapshots.length < 2) return null;

    const values = this.snapshots.map((s) => {
      if (s.gcManager && metric in s.gcManager.gallery) {
        return s.gcManager.gallery[metric] || 0;
      }
      return s[metric] || 0;
    });

    const recent = values.slice(-5);
    const older = values.slice(0, Math.max(1, values.length - 5));

    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
    const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;

    const trend = avgRecent - avgOlder;
    const isIncreasing = trend > 0;
    const changePercent = ((trend / avgOlder) * 100).toFixed(1);

    return {
      metric,
      avgRecent,
      avgOlder,
      trend,
      isIncreasing,
      changePercent,
      isAbnormal: Math.abs(trend) > this.thresholds[metric] * 0.3, // Flag if >30% of threshold
    };
  }

  /**
   * Get memory pressure warning
   */
  checkMemoryPressure() {
    const latest = this.snapshots[this.snapshots.length - 1];
    if (!latest) return null;

    const warnings = [];

    // Check against thresholds
    Object.entries(this.thresholds).forEach(([metric, threshold]) => {
      const value = latest[metric] || 0;
      if (value > threshold) {
        warnings.push({
          level: value > threshold * 1.5 ? 'critical' : 'warning',
          metric,
          value,
          threshold,
          message: `${metric}: ${value} (threshold: ${threshold})`,
        });
      }
    });

    return warnings.length > 0 ? warnings : null;
  }

  /**
   * Format for console output
   */
  formatReport() {
    const latest = this.snapshots[this.snapshots.length - 1];
    if (!latest) return 'No snapshots yet';

    const warnings = this.checkMemoryPressure();
    const trends = Object.keys(this.thresholds).map((metric) => this.analyzeTrend(metric));

    let report = '\n╔════════ MEMORY MONITOR REPORT ════════╗\n';
    report += `║ Timestamp: ${new Date(latest.timestamp).toLocaleTimeString()}\n`;
    report += `║ Samples: ${this.snapshots.length}/${this.maxSnapshots}\n`;
    report += '╠════════════════════════════════════════╣\n';

    // Current counts
    report += '║ CURRENT RESOURCES:\n';
    Object.entries(this.thresholds).forEach(([metric, threshold]) => {
      const value = latest[metric] || 0;
      const status = value > threshold ? '⚠️ ' : '✓ ';
      report += `║ ${status}${metric.padEnd(12)} : ${String(value).padStart(3)} / ${threshold}\n`;
    });

    report += '╠════════════════════════════════════════╣\n';
    report += '║ TRENDS (last 5 samples):\n';
    trends.forEach((trend) => {
      if (trend) {
        const icon = trend.isIncreasing ? '📈' : '📉';
        const warn = trend.isAbnormal ? ' ⚠️' : '';
        report += `║ ${icon} ${trend.metric.padEnd(12)} : ${trend.changePercent.padStart(5)}%${warn}\n`;
      }
    });

    if (warnings && warnings.length > 0) {
      report += '╠════════════════════════════════════════╣\n';
      report += '║ ⚠️  WARNINGS:\n';
      warnings.forEach((w) => {
        report += `║ [${w.level.toUpperCase()}] ${w.message}\n`;
      });
    }

    report += '╚════════════════════════════════════════╝\n';
    return report;
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(interval = 1000, getResourcesFn) {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      if (typeof getResourcesFn === 'function') {
        const resources = getResourcesFn();
        this.takeSnapshot(resources);

        // Check for critical memory pressure
        const warnings = this.checkMemoryPressure();
        if (warnings) {
          const critical = warnings.filter((w) => w.level === 'critical');
          if (critical.length > 0) {
            console.warn('[MEMORY] Critical memory pressure detected:', critical);
          }
        }
      }
    }, interval);

    console.log(`[MEMORY] Monitoring started (interval: ${interval}ms)`);
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
    console.log('[MEMORY] Monitoring stopped');
  }

  /**
   * Get all snapshots
   */
  getHistory() {
    return this.snapshots;
  }

  /**
   * Clear all snapshots
   */
  clearHistory() {
    this.snapshots = [];
  }
}

export { MemoryMonitor };
