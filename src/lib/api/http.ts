import { NextResponse } from "next/server";
import { ServiceError } from "@/lib/db/service";
import { readSession } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/types";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function requireSession(): Promise<
  | { session: SessionUser; error?: undefined }
  | { session?: undefined; error: NextResponse }
> {
  const session = await readSession();
  if (!session) {
    return { error: jsonError(401, "Unauthorized") };
  }
  return { session };
}

export function handleServiceError(err: unknown) {
  if (err instanceof ServiceError) {
    return jsonError(err.status, err.message);
  }
  console.error("[api]", err);
  return jsonError(500, "Internal server error");
}

export async function parseJsonBody<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ServiceError(400, "Invalid JSON body");
  }
}
