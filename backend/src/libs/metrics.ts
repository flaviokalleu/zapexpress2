import { EventEmitter } from 'events';
import { getRedis } from './redis';
import { logger } from '../utils/logger';

// Interface para tipagem dos contadores
interface QueueCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

class MetricsCollector extends EventEmitter {
  private static instance: MetricsCollector;
  private collectInterval: NodeJS.Timeout | null = null;
  private alertInterval: NodeJS.Timeout | null = null;
  private metricsData: Record<string, any> = {};
  private queueNames: string[] = [
    'MessageQueue',
    'CampaignQueue',
    'BatchCampaignQueue',
    'ScheduleMonitor',
    'SendScheduledMessages'
  ];

  private constructor() {
    super();
    this.initMetricsCollection();
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  private initMetricsCollection(): void {
    // Coletar métricas a cada 30 segundos
    this.collectInterval = setInterval(() => {
      this.collectMetrics().catch(err => {
        logger.error('Error collecting metrics:', err);
      });
    }, 30000);

    // Verificar alertas a cada 60 segundos
    this.alertInterval = setInterval(() => {
      this.checkAlerts().catch(err => {
        logger.error('Error checking alerts:', err);
      });
    }, 60000);
  }

  public async collectMetrics(): Promise<void> {
    try {
      const redis = getRedis();
      const prefix = 'zapexpress:';

      // Coletar métricas de filas
      for (const queueName of this.queueNames) {
        try {
          // Obter contadores de jobs
          const waitingCount = await redis.llen(`${prefix}${queueName}:wait`);
          const activeCount = await redis.llen(`${prefix}${queueName}:active`);
          const completedCount = await redis.llen(`${prefix}${queueName}:completed`);
          const failedCount = await redis.llen(`${prefix}${queueName}:failed`);
          const delayedCount = await redis.zcard(`${prefix}${queueName}:delayed`);
          const pausedCount = await redis.llen(`${prefix}${queueName}:paused`);

          const counts: QueueCounts = {
            waiting: waitingCount,
            active: activeCount,
            completed: completedCount,
            failed: failedCount,
            delayed: delayedCount,
            paused: pausedCount
          };

          this.metricsData[queueName] = counts;
          
          // Emitir evento com métricas coletadas
          this.emit('metrics', {
            queueName,
            counts
          });
          
          logger.debug(`Metrics collected for ${queueName}:`, counts);
        } catch (err) {
          logger.error(`Error collecting metrics for queue ${queueName}:`, err);
        }
      }

      // Coletar métricas de uso de memória do Redis
      try {
        const info = await redis.info('memory');
        const usedMemoryMatch = info.match(/used_memory:(\d+)/);
        const usedMemoryRssMatch = info.match(/used_memory_rss:(\d+)/);
        
        if (usedMemoryMatch && usedMemoryRssMatch) {
          const usedMemory = parseInt(usedMemoryMatch[1], 10);
          const usedMemoryRss = parseInt(usedMemoryRssMatch[1], 10);
          
          this.metricsData.redis = {
            usedMemory,
            usedMemoryRss,
            usedMemoryHuman: this.formatBytes(usedMemory),
            usedMemoryRssHuman: this.formatBytes(usedMemoryRss)
          };
          
          this.emit('metrics', {
            type: 'redis',
            memory: this.metricsData.redis
          });
          
          logger.debug('Redis memory metrics:', this.metricsData.redis);
        }
      } catch (err) {
        logger.error('Error collecting Redis memory metrics:', err);
      }
    } catch (err) {
      logger.error('Error in metrics collection:', err);
      throw err;
    }
  }

  private async checkAlerts(): Promise<void> {
    try {
      for (const queueName of this.queueNames) {
        const counts = this.metricsData[queueName] as QueueCounts;
        if (!counts) continue;

        // Alerta para filas com muitos jobs pendentes ou ativos
        if (counts.waiting > 1000 || counts.active > 100) {
          this.emit('alert', {
            type: 'high_load',
            severity: 'warning',
            queueName,
            message: `Queue ${queueName} has high load: ${counts.waiting} waiting, ${counts.active} active`
          });
        }

        // Alerta para filas com muitos jobs falhos
        if (counts.failed > 50) {
          this.emit('alert', {
            type: 'high_failure',
            severity: 'error',
            queueName,
            message: `Queue ${queueName} has many failed jobs: ${counts.failed}`
          });
        }
      }

      // Alerta para uso de memória do Redis
      const redisMetrics = this.metricsData.redis;
      if (redisMetrics && redisMetrics.usedMemory > 1024 * 1024 * 1024) { // > 1GB
        this.emit('alert', {
          type: 'high_memory',
          severity: 'warning',
          message: `Redis memory usage is high: ${redisMetrics.usedMemoryHuman}`
        });
      }
    } catch (err) {
      logger.error('Error checking alerts:', err);
    }
  }

  public getMetrics(): Record<string, any> {
    return this.metricsData;
  }

  public stopCollection(): void {
    if (this.collectInterval) {
      clearInterval(this.collectInterval);
      this.collectInterval = null;
    }
    if (this.alertInterval) {
      clearInterval(this.alertInterval);
      this.alertInterval = null;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Exportar instância singleton
export const metricsCollector = MetricsCollector.getInstance();

// Exportar funções auxiliares
export const getQueueMetrics = (queueName: string): QueueCounts | null => {
  const metrics = metricsCollector.getMetrics();
  return metrics[queueName] || null;
};

export const getAllMetrics = (): Record<string, any> => {
  return metricsCollector.getMetrics();
};

export const startMetricsCollection = (): void => {
  // Já iniciado pelo singleton
};

export const stopMetricsCollection = (): void => {
  metricsCollector.stopCollection();
};
