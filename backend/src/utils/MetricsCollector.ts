import { logger } from './logger';

export class MetricsCollector {
  private metrics: Map<string, number>;
  private latencies: Map<string, number[]>;
  private errors: Error[];

  constructor() {
    this.metrics = new Map();
    this.latencies = new Map();
    this.errors = [];
  }

  increment(metric: string, value: number = 1): void {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
    logger.info(`Metric ${metric} incremented to ${current + value}`);
  }

  recordLatency(metric: string, latency: number): void {
    if (!this.latencies.has(metric)) {
      this.latencies.set(metric, []);
    }
    this.latencies.get(metric)?.push(latency);
    
    const avg = this.getAverageLatency(metric);
    logger.info(`Latency ${metric}: ${latency}ms (avg: ${avg}ms)`);
  }

  recordError(error: Error): void {
    this.errors.push(error);
    logger.error(`Error recorded: ${error.message}`);
  }

  getMetric(metric: string): number {
    return this.metrics.get(metric) || 0;
  }

  getAverageLatency(metric: string): number {
    const latencies = this.latencies.get(metric) || [];
    if (latencies.length === 0) return 0;
    return latencies.reduce((a, b) => a + b, 0) / latencies.length;
  }

  getErrorCount(): number {
    return this.errors.length;
  }

  reset(): void {
    this.metrics.clear();
    this.latencies.clear();
    this.errors = [];
  }
} 