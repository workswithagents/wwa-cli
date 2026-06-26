/**
 * Retry utility with exponential backoff.
 *
 * Retries an async function on any thrown error, doubling the delay
 * between each attempt. The first retry waits `delay` ms, the second
 * waits `2 * delay` ms, the third `4 * delay` ms, and so on.
 */

/** Options for {@link withRetry}. */
export interface RetryOptions {
  /** Maximum number of attempts (including the first call). Default: 3. */
  maxAttempts?: number;
  /** Base delay in milliseconds before the first retry. Default: 100. */
  delay?: number;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_DELAY = 100;

/**
 * Call `fn` and retry with exponential backoff on any error.
 *
 * @typeParam T - The resolved type of the promise returned by `fn`.
 * @param fn - An async function to call.
 * @param options - Optional retry configuration.
 * @returns The resolved value of `fn`.
 * @throws The last error from `fn` after exhausting all attempts.
 *
 * @example
 * ```ts
 * // Basic usage — retries up to 3 times with 100 ms base delay
 * const result = await withRetry(() => fetchJson("https://example.com/api"));
 *
 * // Custom attempts and delay
 * const result = await withRetry(() => doWork(), { maxAttempts: 5, delay: 200 });
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const delay = options.delay ?? DEFAULT_DELAY;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) break;
      const backoff = delay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  throw lastError;
}
