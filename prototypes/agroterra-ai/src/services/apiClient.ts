/**
 * Base REST API client abstraction prepared for Spring Boot / FastAPI backend integration.
 * Currently resolves against local demonstration storage with simulated latency support.
 */
export interface ApiRequestOptions {
  simulateError?: boolean;
  delayMs?: number;
}

export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  mode: 'demo-local' as 'demo-local' | 'remote-rest',
};

export async function withSimulatedTransport<T>(
  producer: () => T,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { simulateError = false, delayMs = 0 } = options;
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  if (simulateError) {
    throw new Error('Error simulado de conexión con el servicio de datos.');
  }
  return producer();
}
