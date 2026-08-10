import { NextResponse } from "next/server";
import { getDevPlainPassword } from "@/lib/auth/credentials";
import { isDevLoginEnabled } from "@/lib/env";
import { DEV_ROSTER } from "@/lib/mockDb/users";

/**
 * Dev-only: returns username + plaintext for quick-select autofill.
 * Allowed only when NODE_ENV !== production AND ENABLE_DEV_LOGIN=true.
 */
export async function GET(req: Request) {
  if (!isDevLoginEnabled()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const password = getDevPlainPassword();
  if (!password) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const user = DEV_ROSTER.find((u) => u.id === id);
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    username: user.username,
    password,
  });
}
