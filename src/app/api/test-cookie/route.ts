import { NextResponse } from "next/server";
import { cookies } from "next/headers";
export async function GET() {
  const jar = await cookies();
  jar.set("test_cookie", "123", { maxAge: 604800 });
  return NextResponse.json({ ok: true });
}
