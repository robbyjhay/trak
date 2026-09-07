/**
 * Cross-bundle WebSocket sender bridge.
 *
 * The custom server (server.ts, run via tsx) hosts both the HTTP/API layer and
 * the WebSocket server. Next.js bundles API routes into their own chunk, which
 * means a plain module-level closure in this file would be duplicated across
 * the server entrypoint and the bundled routes (two separate instances).
 *
 * To reliably reach the live WebSocket connections from an API route, we share
 * the sender function through `globalThis`, which is process-wide and therefore
 * identical across the bundler boundary.
 */

export function setWsSender(fn: ((userId: string, data: object) => void) | null) {
  (globalThis as any).__trakWsSender = fn;
}

export function sendToUser(userId: string, data: object) {
  try {
    const fn = (globalThis as any).__trakWsSender as
      | ((userId: string, data: object) => void)
      | undefined;
    fn?.(userId, data);
  } catch {
    /* no-op */
  }
}

export function setWsBroadcaster(fn: ((data: object, excludeId?: string) => void) | null) {
  (globalThis as any).__trakWsBroadcaster = fn;
}

export function broadcast(data: object, excludeId?: string) {
  try {
    const fn = (globalThis as any).__trakWsBroadcaster as
      | ((data: object, excludeId?: string) => void)
      | undefined;
    fn?.(data, excludeId);
  } catch {
    /* no-op */
  }
}
