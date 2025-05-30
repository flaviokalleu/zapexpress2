import { getRedis } from '../libs/redis';
import { logger } from '../utils/logger';

/**
 * Classe para gerenciamento de cache de consultas ao banco de dados
 * Implementa padrão de cache-aside para reduzir carga no banco
 */
class QueryCache {
  /**
   * Obtém dados do cache ou executa a função de fallback para buscar do banco
   * @param key Chave única para o cache
   * @param fallbackFn Função assíncrona que retorna os dados caso não estejam em cache
   * @param ttl Tempo de vida do cache em segundos (padrão: 5 minutos)
   * @param companyId ID da empresa para namespacing (opcional)
   */
  async getOrSet<T>(
    key: string, 
    fallbackFn: () => Promise<T>, 
    ttl: number = 300,
    companyId?: number
  ): Promise<T> {
    try {
      const redis = getRedis();
      const cacheKey = companyId ? `cache:${companyId}:${key}` : `cache:${key}`;
      
      // Tentar obter do cache primeiro
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        logger.debug(`Cache hit: ${cacheKey}`);
        return JSON.parse(cachedData);
      }
      
      // Se não estiver em cache, executar função de fallback
      logger.debug(`Cache miss: ${cacheKey}`);
      const data = await fallbackFn();
      
      // Salvar no cache com TTL especificado
      if (data !== null && data !== undefined) {
        await redis.set(cacheKey, JSON.stringify(data), 'EX', ttl);
      }
      
      return data;
    } catch (err) {
      logger.error(`Error in cache operation for key ${key}:`, err);
      // Em caso de erro no cache, executar função de fallback diretamente
      return fallbackFn();
    }
  }
  
  /**
   * Invalida uma chave específica do cache
   * @param key Chave a ser invalidada
   * @param companyId ID da empresa para namespacing (opcional)
   */
  async invalidate(key: string, companyId?: number): Promise<void> {
    try {
      const redis = getRedis();
      const cacheKey = companyId ? `cache:${companyId}:${key}` : `cache:${key}`;
      await redis.del(cacheKey);
      logger.debug(`Cache invalidated: ${cacheKey}`);
    } catch (err) {
      logger.error(`Error invalidating cache for key ${key}:`, err);
    }
  }
  
  /**
   * Invalida múltiplas chaves de cache com base em um padrão
   * @param pattern Padrão para invalidação (ex: "user:*")
   * @param companyId ID da empresa para namespacing (opcional)
   */
  async invalidatePattern(pattern: string, companyId?: number): Promise<void> {
    try {
      const redis = getRedis();
      const cachePattern = companyId ? `cache:${companyId}:${pattern}` : `cache:${pattern}`;
      
      // Encontrar todas as chaves que correspondem ao padrão
      const keys = await redis.keys(cachePattern);
      
      if (keys.length > 0) {
        // Excluir todas as chaves encontradas
        await redis.del(...keys);
        logger.debug(`Cache invalidated by pattern: ${cachePattern}, ${keys.length} keys removed`);
      }
    } catch (err) {
      logger.error(`Error invalidating cache for pattern ${pattern}:`, err);
    }
  }
  
  /**
   * Limpa todo o cache relacionado a uma empresa específica
   * @param companyId ID da empresa
   */
  async clearCompanyCache(companyId: number): Promise<void> {
    return this.invalidatePattern('*', companyId);
  }
  
  /**
   * Obtém estatísticas de uso do cache
   */
  async getStats(): Promise<any> {
    try {
      const redis = getRedis();
      const info = await redis.info('stats');
      
      const keyspaceHits = info.match(/keyspace_hits:(\d+)/)?.[1];
      const keyspaceMisses = info.match(/keyspace_misses:(\d+)/)?.[1];
      
      const hits = keyspaceHits ? parseInt(keyspaceHits, 10) : 0;
      const misses = keyspaceMisses ? parseInt(keyspaceMisses, 10) : 0;
      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;
      
      return {
        hits,
        misses,
        total,
        hitRate: Math.round(hitRate * 100) / 100
      };
    } catch (err) {
      logger.error('Error getting cache stats:', err);
      return {
        hits: 0,
        misses: 0,
        total: 0,
        hitRate: 0,
        error: true
      };
    }
  }
}

// Exportar singleton
export const queryCache = new QueryCache();
export default queryCache;
