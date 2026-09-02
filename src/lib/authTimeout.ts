const AUTH_TIMEOUT_MS = 15_000;

export class AuthTimeoutError extends Error {
  constructor(message = "The request took too long. Check your connection and try again.") {
    super(message);
    this.name = "AuthTimeoutError";
  }
}

export function withAuthTimeout<T>(
  operation: PromiseLike<T>,
  timeoutMs = AUTH_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new AuthTimeoutError()), timeoutMs);

    Promise.resolve(operation).then(
      (result) => {
        window.clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AuthTimeoutError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}