import { logger } from "./logger.js";

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffFactor = 2,
    shouldRetry = (err: unknown) => {
      const e = err as {
        status?: number;
        statusCode?: number;
        response?: { status?: number };
        code?: string;
      } | null;
      const status = e?.status || e?.statusCode || e?.response?.status;
      // Retry on rate limits (429) and server errors (500, 502, 503, 504)
      return (
        status === 429 ||
        (typeof status === "number" && status >= 500 && status <= 504) ||
        e?.code === "ECONNRESET"
      );
    },
  } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > maxRetries || !shouldRetry(error)) {
        throw error;
      }
      const jitter = Math.random() * 200;
      const waitTime = Math.min(delay + jitter, maxDelayMs);
      logger.warn(
        `API call failed (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(waitTime)}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      delay *= backoffFactor;
    }
  }
}
