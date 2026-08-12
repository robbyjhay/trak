/**
 * Phase 5 launch-day smoke test (AUDIT_08).
 * Hits health, ready, login, session, bootstrap against a running server.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 \
 *   SMOKE_USER=DLUARU \
 *   SMOKE_PASSWORD=... \
 *   node scripts/smoke-launch.mjs
 */
import "dotenv/config";

const BASE = (process.env.BASE_URL || process.env.APP_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const USER = process.env.SMOKE_USER || "DLUARU";
const PASS =
  process.env.SMOKE_PASSWORD ||
  process.env.DEV_SEED_PASSWORD ||
  "";

function fail(msg) {
  console.error("✗", msg);
  process.exitCode = 1;
}

function ok(msg) {
  console.log("✓", msg);
}

async function jsonFetch(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

function cookieFrom(res) {
  // Node fetch may expose getSetCookie
  const multi =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [];
  if (multi.length) {
    return multi.map((c) => c.split(";")[0]).join("; ");
  }
  const single = res.headers.get("set-cookie");
  if (!single) return "";
  return single.split(",").map((p) => p.trim().split(";")[0]).join("; ");
}

async function main() {
  console.log(`Smoke launch against ${BASE}`);

  {
    const { res, body } = await jsonFetch("/api/health");
    if (res.status !== 200 || body?.status !== "ok") {
      fail(`health: ${res.status} ${JSON.stringify(body)}`);
    } else {
      ok(`health (${body.latencyMs ?? "?"}ms)`);
    }
  }

  {
    const { res, body } = await jsonFetch("/api/ready");
    if (res.status !== 200 || body?.status !== "ready") {
      fail(`ready: ${res.status} ${JSON.stringify(body)}`);
    } else {
      ok(`ready db=${body.database} (${body.latencyMs ?? "?"}ms)`);
    }
  }

  if (!PASS) {
    fail("SMOKE_PASSWORD or DEV_SEED_PASSWORD required for login smoke");
    return;
  }

  let cookie = "";
  {
    const t0 = Date.now();
    const { res, body } = await jsonFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: USER, password: PASS }),
    });
    cookie = cookieFrom(res);
    if (res.status !== 200 || !body?.ok) {
      fail(`login: ${res.status} ${JSON.stringify(body)}`);
    } else if (!cookie.includes("trak_session")) {
      fail("login: missing trak_session cookie");
    } else {
      ok(`login as ${USER} (${Date.now() - t0}ms) mustChange=${body.mustChangePassword}`);
    }
  }

  {
    const { res, body } = await jsonFetch("/api/auth/session", {
      headers: { Cookie: cookie },
    });
    if (res.status !== 200 || !body?.user?.id) {
      fail(`session: ${res.status} ${JSON.stringify(body)}`);
    } else {
      ok(`session user=${body.user.username} role=${body.user.role}`);
    }
  }

  {
    const t0 = Date.now();
    const { res, body } = await jsonFetch("/api/bootstrap", {
      headers: { Cookie: cookie },
    });
    const ms = Date.now() - t0;
    if (res.status !== 200 || !Array.isArray(body?.users) || !body?.db) {
      fail(`bootstrap: ${res.status} ${JSON.stringify(body)?.slice?.(0, 200)}`);
    } else if (ms > 15_000) {
      fail(`bootstrap too slow: ${ms}ms`);
    } else {
      ok(
        `bootstrap users=${body.users.length} activities=${body.db.activities?.length ?? 0} (${ms}ms)`,
      );
    }
  }

  {
    const { res } = await jsonFetch("/api/auth/logout", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    if (res.status !== 200 && res.status !== 204) {
      // logout may be a server action only — soft check
      ok(`logout endpoint status ${res.status} (optional)`);
    } else {
      ok("logout");
    }
  }

  if (process.exitCode) {
    console.error("\nLaunch smoke FAILED");
    process.exit(1);
  }
  console.log("\nLaunch smoke PASSED");
}

main().catch((e) => {
  console.error("✗ unexpected", e);
  process.exit(1);
});
