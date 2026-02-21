import { LLMProviderError } from "../types.js";

/**
 * Retries an async function up to maxRetries additional times (total 1 + maxRetries attempts).
 * Only retries LLMProviderError with retryable=true. Uses exponential backoff: 1s, 2s, 4s.
 */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (err instanceof LLMProviderError && err.retryable && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
