import { Injectable, Logger } from '@nestjs/common';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface ProviderState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt: number;
  lastSuccessAt: number;
  openedAt: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);

  // Configurações
  private readonly failureThreshold = 5;
  private readonly recoveryTimeoutMs = 300_000; // 5 minutos
  private readonly halfOpenMaxAttempts = 3;
  private readonly windowMs = 300_000; // Janela de 5 minutos

  // Estado por provider
  private readonly providers = new Map<string, ProviderState>();

  /**
   * Verificar se o provider pode receber chamadas
   */
  canExecute(provider: string): boolean {
    const state = this.getState(provider);

    switch (state.state) {
      case 'CLOSED':
        return true;

      case 'OPEN': {
        const now = Date.now();
        if (now - state.openedAt >= this.recoveryTimeoutMs) {
          state.state = 'HALF_OPEN';
          state.successCount = 0;
          this.logger.warn(
            `Circuit breaker for ${provider}: OPEN → HALF_OPEN`
          );
          return true;
        }
        return false;
      }

      case 'HALF_OPEN':
        return state.successCount < this.halfOpenMaxAttempts;

      default:
        return true;
    }
  }

  /**
   * Registrar sucesso
   */
  recordSuccess(provider: string): void {
    const state = this.getState(provider);

    if (state.state === 'HALF_OPEN') {
      state.successCount++;
      if (state.successCount >= this.halfOpenMaxAttempts) {
        state.state = 'CLOSED';
        state.failureCount = 0;
        state.successCount = 0;
        this.logger.log(
          `Circuit breaker for ${provider}: HALF_OPEN → CLOSED`
        );
      }
    } else if (state.state === 'CLOSED') {
      const now = Date.now();
      if (now - state.lastFailureAt > this.windowMs) {
        state.failureCount = 0;
      }
    }

    state.lastSuccessAt = Date.now();
  }

  /**
   * Registrar falha
   */
  recordFailure(provider: string): void {
    const state = this.getState(provider);
    const now = Date.now();

    state.failureCount++;
    state.lastFailureAt = now;

    if (state.state === 'HALF_OPEN') {
      state.state = 'OPEN';
      state.openedAt = now;
      this.logger.warn(
        `Circuit breaker for ${provider}: HALF_OPEN → OPEN`
      );
    } else if (
      state.state === 'CLOSED' &&
      state.failureCount >= this.failureThreshold
    ) {
      state.state = 'OPEN';
      state.openedAt = now;
      this.logger.warn(
        `Circuit breaker for ${provider}: CLOSED → OPEN (${state.failureCount} failures)`
      );
    }
  }

  /**
   * Obter estado de um provider
   */
  getState(provider: string): ProviderState {
    if (!this.providers.has(provider)) {
      this.providers.set(provider, {
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        lastFailureAt: 0,
        lastSuccessAt: 0,
        openedAt: 0,
      });
    }
    return this.providers.get(provider)!;
  }

  /**
   * Reset manual de um provider
   */
  reset(provider: string): void {
    this.providers.delete(provider);
    this.logger.log(`Circuit breaker for ${provider}: reset`);
  }
}
