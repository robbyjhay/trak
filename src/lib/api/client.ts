/**
 * Browser-side API client for Trak backend routes.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const DEFAULT_TIMEOUT_MS = 25_000;

function extractErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const err = (body as { error?: unknown }).error;
  if (typeof err === "string" && err.trim()) return err;
  if (err && typeof err === "object") {
    const nested = err as { message?: unknown; code?: unknown };
    if (typeof nested.message === "string" && nested.message.trim()) {
      return nested.message;
    }
  }
  if (
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  return fallback;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text };
    }
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      extractErrorMessage(body, res.statusText || "Request failed"),
    );
  }
  return body as T;
}

type FetchOpts = {
  signal?: AbortSignal;
  /** Override default request timeout (ms). 0 disables. */
  timeoutMs?: number;
};

async function fetchWithTimeout(
  path: string,
  init: RequestInit,
  opts?: FetchOpts,
): Promise<Response> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const onOuterAbort = () => controller.abort();
  if (opts?.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener("abort", onOuterAbort, { once: true });
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  if (timeoutMs > 0) {
    timer = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    return await fetch(path, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, "Request timed out. Check your connection and try again.");
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
    opts?.signal?.removeEventListener("abort", onOuterAbort);
  }
}

export async function apiGet<T>(path: string, opts?: FetchOpts): Promise<T> {
  const res = await fetchWithTimeout(
    path,
    { method: "GET" },
    opts,
  );
  return parseResponse<T>(res);
}

export async function apiSend<T>(
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
  opts?: FetchOpts,
): Promise<T> {
  const res = await fetchWithTimeout(
    path,
    {
      method,
      headers:
        body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    opts,
  );
  return parseResponse<T>(res);
}
