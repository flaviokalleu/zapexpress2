import { EventEmitter } from 'events';
import { getRedis } from './redis';
import os from 'os';
import { logger } from '../utils/logger';

class Metrics extends EventEmitter {
  private interval: NodeJS.Timeout | null = null;
  
  start(intervalMs: number = 60000): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
    
    this.interval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
    
    logger.info(`Metrics collection started with interval of ${intervalMs}ms`);
  }
  
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('Metrics collection stopped');
    }
  }
  
  private async collectMetrics(): Promise<void> {
    try {
      // Coletar métricas de memória do Node.js
      const memoryUsage = process.memoryUsage();
      
      // Coletar métricas do sistema
      const systemMemory = {
        total: os.totalmem(),
        free: os.freemem(),
        cpus: os.cpus().length,
        loadAvg: os.loadavg()
      };
      
      // Coletar métricas do Redis
      const redis = getRedis();
      const redisInfo = await redis.info();
      
      // Coletar métricas das filas
      const queueCounts = await this.getQueueCounts();
      
      const metrics = {
        timestamp: Date.now(),
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100, // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
          external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100, // MB
        },
        system: {
          totalMemory: Math.round(systemMemory.total / 1024 / 1024 / 1024 * 100) / 100, // GB
          freeMemory: Math.round(systemMemory.free / 1024 / 1024 / 1024 * 100) / 100, // GB
          cpus: systemMemory.cpus,
          loadAvg: systemMemory.loadAvg
        },
        redis: this.parseRedisInfo(redisInfo),
        queues: queueCounts
      };
      
      // Emitir evento com métricas
      this.emit('metrics', metrics);
      
      // Salvar métricas no Redis para histórico
      await this.saveMetrics(metrics);
      
      // Verificar limites e emitir alertas se necessário
      this.checkLimits(metrics);
    } catch (err) {
      logger.error('Error collecting metrics:', err);
    }
  }
  
  private parseRedisInfo(info: string): any {
    // Extrair métricas relevantes do Redis INFO
    const metrics: any = {};
    const lines = info.split('\n');
    
    for (const line of lines) {
      if (line.includes('used_memory:')) {
        metrics.usedMemory = parseInt(line.split(':')[1], 10) / 1024 / 1024; // MB
      }
      if (line.includes('used_memory_peak:')) {
        metrics.peakMemory = parseInt(line.split(':')[1], 10) / 1024 / 1024; // MB
      }
      if (line.includes('connected_clients:')) {
        metrics.connectedClients = parseInt(line.split(':')[1], 10);
      }
      if (line.includes('total_commands_processed:')) {
        metrics.commandsProcessed = parseInt(line.split(':')[1], 10);
      }
      if (line.includes('keyspace_hits:')) {
        metrics.keyspaceHits = parseInt(line.split(':')[1], 10);
      }
      if (line.includes('keyspace_misses:')) {
        metrics.keyspaceMisses = parseInt(line.split(':')[1], 10);
      }
    }
    
    // Calcular taxa de acerto do cache
    if (metrics.keyspaceHits !== undefined && metrics.keyspaceMisses !== undefined) {
      const total = metrics.keyspaceHits + metrics.keyspaceMisses;
      metrics.hitRate = total > 0 ? Math.round((metrics.keyspaceHits / total) * 100) : 0;
    }
    
    return metrics;
  }
  
  private async getQueueCounts(): Promise<any> {
    const redis = getRedis();
    const queues = [
      'MessageQueue',
      'CampaignQueue',
      'ScheduleMonitor',
      'BatchCampaignQueue',
      'SendScheduledMessages'
    ];
    
    const counts: any = {};
    
    for (const queue of queues) {
      try {
        const waiting = await redis.llen(`bull:${queue}:wait`) || 0;
        const active = await redis.llen(`bull:${queue}:active`) || 0;
        const delayed = await redis.zcard(`bull:${queue}:delayed`) || 0;
        const failed = await redis.llen(`bull:${queue}:failed`) || 0;
        const completed = await redis.llen(`bull:${queue}:completed`) || 0;
        
        counts[queue] = { waiting, active, delayed, failed, completed };
      } catch (err) {
        logger.error(`Error getting queue counts for ${queue}:`, err);
        counts[queue] = { error: true };
      }
    }
    
    return counts;
  }
  
  private async saveMetrics(metrics: any): Promise<void> {
    try {
      const redis = getRedis();
      const key = `metrics:${metrics.timestamp}`;
      
      // Salvar métricas com TTL de 24 horas
      await redis.set(key, JSON.stringify(metrics), 'EX', 24 * 60 * 60);
      
      // Adicionar à lista de métricas recentes (limitada a 1000 entradas)
      await redis.lpush('metrics:recent', key);
      await redis.ltrim('metrics:recent', 0, 999);
    } catch (err) {
      logger.error('Error saving metrics:', err);
    }
  }
  
  private checkLimits(metrics: any): void {
    // Verificar uso de memória do Node.js
    if (metrics.memory.heapUsed > 1024) { // Mais de 1GB
      this.emit('alert', {
        type: 'memory',
        level: 'warning',
        message: `High memory usage: ${metrics.memory.heapUsed.toFixed(2)} MB`
      });
    }
    
    // Verificar uso de memória do Redis
    if (metrics.redis.usedMemory > 1024) { // Mais de 1GB
      this.emit('alert', {
        type: 'redis',
        level: 'warning',
        message: `High Redis memory usage: ${metrics.redis.usedMemory.toFixed(2)} MB`
      });
    }
    
    // Verificar carga do sistema
    if (metrics.system.loadAvg[0] > metrics.system.cpus * 0.8) { // 80% de uso da CPU
      this.emit('alert', {
        type: 'system',
        level: 'warning',
        message: `High system load: ${metrics.system.loadAvg[0].toFixed(2)}`
      });
    }
    
    // Verificar filas com muitos jobs pendentes
    for (const [queueName, counts] of Object.entries(metrics.queues)) {
      if (counts.waiting > 1000 || counts.active > 100) {
        this.emit('alert', {
          type: 'queue',
          level: 'warning',
          message: `Queue ${queueName} has high load: ${counts.waiting} waiting, ${counts.active} active`
        });
      }
      
      if (counts.failed > 50) {
        this.emit('alert', {
          type: 'queue',
          level: 'error',
          message: `Queue ${queueName} has many failed jobs: ${counts.failed}`
        });
      }
    }
  }
  
  // Método para obter métricas sob demanda
  async getMetrics(): Promise<any> {
    const memoryUsage = process.memoryUsage();
    const systemMemory = {
      total: os.totalmem(),
      free: os.freemem(),
      cpus: os.cpus().length,
      loadAvg: os.loadavg()
    };
    
    return {
      timestamp: Date.now(),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100, // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
        external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100, // MB
      },
      system: {
        totalMemory: Math.round(systemMemory.total / 1024 / 1024 / 1024 * 100) / 100, // GB
        freeMemory: Math.round(systemMemory.free / 1024 / 1024 / 1024 * 100) / 100, // GB
        cpus: systemMemory.cpus,
        loadAvg: systemMemory.loadAvg
      }
    };
  }
  
  // Método para obter histórico de métricas
  async getMetricsHistory(limit: number = 60): Promise<any[]> {
    try {
      const redis = getRedis();
      const keys = await redis.lrange('metrics:recent', 0, limit - 1);
      
      if (!keys || keys.length === 0) {
        return [];
      }
      
      const metrics = [];
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          metrics.push(JSON.parse(data));
        }
      }
      
      return metrics;
    } catch (err) {
      logger.error('Error getting metrics history:', err);
      return [];
    }
  }
}

export const metrics = new Metrics();

// Registrar handlers para métricas e alertas
metrics.on('metrics', (data) => {
  logger.debug('Metrics collected:', JSON.stringify(data, null, 2));
});

metrics.on('alert', (alert) => {
  logger.warn(`ALERT [${alert.type}] ${alert.level}: ${alert.message}`);
  // Aqui poderia enviar notificações, e-mails, etc.
});

// Exportar singleton
export default metrics;
