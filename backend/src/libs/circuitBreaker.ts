import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN
}

/**
 * Implementação de Circuit Breaker para aumentar a resiliência do sistema
 * Previne falhas em cascata isolando serviços com problemas
 */
class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly successThreshold: number;
  
  /**
   * Cria uma nova instância de Circuit Breaker
   * @param name Nome identificador do circuit breaker
   * @param failureThreshold Número de falhas consecutivas para abrir o circuito
   * @param resetTimeout Tempo em ms para tentar fechar o circuito novamente
   * @param successThreshold Número de sucessos necessários para fechar o circuito
   */
  constructor(
    name: string,
    failureThreshold: number = 5,
    resetTimeout: number = 30000,
    successThreshold: number = 2
  ) {
    super();
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.successThreshold = successThreshold;
    
    logger.info(`Circuit breaker "${name}" initialized with threshold=${failureThreshold}, timeout=${resetTimeout}ms, successThreshold=${successThreshold}`);
  }
  
  /**
   * Executa uma função protegida pelo circuit breaker
   * @param fn Função a ser executada
   * @returns Resultado da função
   * @throws Error se o circuito estiver aberto
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      // Verificar se já passou o tempo de reset
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        logger.info(`Circuit breaker "${this.name}" transitioning from OPEN to HALF_OPEN`);
        this.state = CircuitState.HALF_OPEN;
        this.emit('state-change', { name: this.name, state: 'HALF_OPEN' });
      } else {
        logger.debug(`Circuit breaker "${this.name}" is OPEN, rejecting request`);
        this.emit('rejected', { name: this.name });
        throw new Error(`Circuit breaker "${this.name}" is OPEN`);
      }
    }
    
    try {
      const result = await fn();
      
      // Em estado meio-aberto, incrementar contador de sucesso
      if (this.state === CircuitState.HALF_OPEN) {
        this.successCount++;
        logger.debug(`Circuit breaker "${this.name}" success in HALF_OPEN state, count=${this.successCount}/${this.successThreshold}`);
        
        // Se atingiu o limite de sucessos, fechar o circuito
        if (this.successCount >= this.successThreshold) {
          this.reset();
        }
      } else if (this.state === CircuitState.CLOSED && this.failureCount > 0) {
        // Em estado fechado, resetar contador de falhas após sucesso
        this.failureCount = 0;
      }
      
      this.emit('success', { name: this.name });
      return result;
    } catch (error) {
      this.handleFailure();
      this.emit('failure', { name: this.name, error });
      throw error;
    }
  }
  
  /**
   * Manipula uma falha na execução
   */
  private handleFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    logger.debug(`Circuit breaker "${this.name}" failure, count=${this.failureCount}/${this.failureThreshold}`);
    
    if (
      this.state === CircuitState.CLOSED && 
      this.failureCount >= this.failureThreshold
    ) {
      logger.warn(`Circuit breaker "${this.name}" transitioning from CLOSED to OPEN after ${this.failureCount} failures`);
      this.state = CircuitState.OPEN;
      this.emit('state-change', { name: this.name, state: 'OPEN' });
    } else if (this.state === CircuitState.HALF_OPEN) {
      logger.warn(`Circuit breaker "${this.name}" transitioning from HALF_OPEN to OPEN after failure`);
      this.state = CircuitState.OPEN;
      this.emit('state-change', { name: this.name, state: 'OPEN' });
    }
  }
  
  /**
   * Reseta o circuit breaker para o estado fechado
   */
  private reset(): void {
    if (this.state !== CircuitState.CLOSED) {
      logger.info(`Circuit breaker "${this.name}" transitioning to CLOSED`);
      this.emit('state-change', { name: this.name, state: 'CLOSED' });
    }
    
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
  }
  
  /**
   * Obtém o estado atual do circuit breaker
   */
  getState(): string {
    return CircuitState[this.state];
  }
  
  /**
   * Força a abertura do circuito (útil para testes ou manutenção)
   */
  forceOpen(): void {
    if (this.state !== CircuitState.OPEN) {
      logger.warn(`Circuit breaker "${this.name}" forced to OPEN state`);
      this.state = CircuitState.OPEN;
      this.lastFailureTime = Date.now();
      this.emit('state-change', { name: this.name, state: 'OPEN' });
    }
  }
  
  /**
   * Força o fechamento do circuito (útil para testes ou recuperação manual)
   */
  forceClose(): void {
    if (this.state !== CircuitState.CLOSED) {
      logger.warn(`Circuit breaker "${this.name}" forced to CLOSED state`);
      this.reset();
    }
  }
  
  /**
   * Obtém estatísticas do circuit breaker
   */
  getStats(): any {
    return {
      name: this.name,
      state: CircuitState[this.state],
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime > 0 ? new Date(this.lastFailureTime).toISOString() : null,
      config: {
        failureThreshold: this.failureThreshold,
        resetTimeout: this.resetTimeout,
        successThreshold: this.successThreshold
      }
    };
  }
}

// Criar circuit breakers para diferentes serviços
export const whatsappCircuitBreaker = new CircuitBreaker('whatsapp', 5, 60000, 3);
export const databaseCircuitBreaker = new CircuitBreaker('database', 3, 30000, 2);
export const redisCircuitBreaker = new CircuitBreaker('redis', 3, 15000, 2);
export const campaignCircuitBreaker = new CircuitBreaker('campaign', 5, 120000, 3);

// Registrar handlers para eventos
[whatsappCircuitBreaker, databaseCircuitBreaker, redisCircuitBreaker, campaignCircuitBreaker].forEach(cb => {
  cb.on('state-change', (data) => {
    if (data.state === 'OPEN') {
      logger.warn(`Circuit breaker "${data.name}" is now OPEN`);
    } else if (data.state === 'CLOSED') {
      logger.info(`Circuit breaker "${data.name}" is now CLOSED`);
    } else {
      logger.info(`Circuit breaker "${data.name}" is now ${data.state}`);
    }
  });
});

// Exportar todos os circuit breakers
export const circuitBreakers = {
  whatsapp: whatsappCircuitBreaker,
  database: databaseCircuitBreaker,
  redis: redisCircuitBreaker,
  campaign: campaignCircuitBreaker
};

export default circuitBreakers;
