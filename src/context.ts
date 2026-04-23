import { AsyncLocalStorage } from "node:async_hooks";

export interface Credentials {
  apiKey: string;
  organizationId: string;
}

const credentialStore = new AsyncLocalStorage<Credentials>();

/**
 * Runs `fn` with `credentials` attached to the current async context.
 * Downstream calls to `getCurrentCredentials()` inside `fn` (and any async
 * work it awaits) resolve to the provided credentials.
 *
 * Used by the HTTP transport to scope credentials to a single request.
 */
export function withCredentials<T>(credentials: Credentials, fn: () => T): T {
  return credentialStore.run(credentials, fn);
}

/**
 * Returns the credentials bound to the current async context, or `undefined`
 * if none were set. Callers fall back to environment variables when this is
 * `undefined` (stdio mode).
 */
export function getCurrentCredentials(): Credentials | undefined {
  return credentialStore.getStore();
}
