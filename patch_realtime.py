with open('src/lib/realtime.ts', 'r') as f:
    content = f.read()

content += """
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
"""

with open('src/lib/realtime.ts', 'w') as f:
    f.write(content)
