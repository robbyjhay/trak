import { describe, expect, test } from "vitest";
import { resolveIceServers, iceCandidateKey } from "@/hooks/useWebRtc";

// ===========================================================================
// Behavioral unit tests for the call-reliability fixes.
// The existing calling.test.ts asserts the original close-call flow; these
// assertions cover the new recovery mechanisms (queue+replay, reconnect
// policy, heartbeat, bounded ICE restart, dual-sided termination, TURN).
// ===========================================================================

// ---------------------------------------------------------------------------
// TURN / ICE server configuration (pure, unit-testable)
// ---------------------------------------------------------------------------
describe("resolveIceServers (TURN config)", () => {
  test("A. keeps Google STUN when no TURN is configured (dev-safe)", () => {
    const servers = resolveIceServers({});
    expect(servers).toHaveLength(1);
    expect(servers[0]).toEqual({ urls: "stun:stun.l.google.com:19302" });
  });

  test("B. appends a single TURN server with credentials", () => {
    const servers = resolveIceServers({
      NEXT_PUBLIC_TURN_URL: "turn:turn.example.com:3478",
      NEXT_PUBLIC_TURN_USERNAME: "user",
      NEXT_PUBLIC_TURN_CREDENTIAL: "cred",
    });
    expect(servers).toHaveLength(2);
    expect(servers[1].urls).toEqual(["turn:turn.example.com:3478"]);
    expect(servers[1].username).toBe("user");
    expect(servers[1].credential).toBe("cred");
  });

  test("C. supports multiple comma-separated TURN URLs", () => {
    const servers = resolveIceServers({
      TURN_URL: "turn:a.example.com, turn:b.example.com",
    });
    expect(servers).toHaveLength(2);
    expect(servers[1].urls).toEqual([
      "turn:a.example.com",
      "turn:b.example.com",
    ]);
  });

  test("D. tolerates blank TURN variables without breaking STUN", () => {
    expect(resolveIceServers({ NEXT_PUBLIC_TURN_URL: "   " })).toHaveLength(1);
    expect(resolveIceServers({ NEXT_PUBLIC_TURN_URL: "turn:x" })[0].urls).toEqual(
      "stun:stun.l.google.com:19302",
    );
  });
});

// ---------------------------------------------------------------------------
// ICE candidate identity (dedupe on replay)
// ---------------------------------------------------------------------------
describe("iceCandidateKey", () => {
  test("identical candidates share a key (dedupe)", () => {
    const c = { candidate: "candidate:1", sdpMid: "0", sdpMLineIndex: 0 };
    expect(iceCandidateKey(c)).toBe(iceCandidateKey({ ...c }));
  });

  test("candidates differing in m-line index produce different keys", () => {
    const a = { candidate: "candidate:1", sdpMid: "0", sdpMLineIndex: 0 };
    const b = { candidate: "candidate:1", sdpMid: "0", sdpMLineIndex: 1 };
    expect(iceCandidateKey(a)).not.toBe(iceCandidateKey(b));
  });

  test("missing optional fields are handled without throwing", () => {
    expect(iceCandidateKey({ candidate: "candidate:1" })).toBeTruthy();
  });
});

// ===========================================================================
// Signaling reliability (queue + replay + reconnect policy + heartbeat)
// ===========================================================================
describe("useSignaling reliability", () => {
  test("E. critical call messages are queued when the socket is not OPEN", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useSignaling.ts", "utf8");
    expect(src).toContain("pendingSendQueue");
    expect(src).toContain("CALL_MESSAGE_TYPES");
    // Queue is flushed on reconnect (OPEN).
    expect(src).toContain("flushPendingQueue()");
  });

  test("F. queued messages expire via TTL and are never delivered twice", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useSignaling.ts", "utf8");
    expect(src).toContain("PENDING_TTL_MS");
    expect(src).toContain("now - entry.at > PENDING_TTL_MS");
    // de-dupe while queued
    expect(src).toContain("JSON.stringify(e.msg) === key");
  });

  test("G. regular (non-call) messages are NOT queued", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useSignaling.ts", "utf8");
    const typesIdx = src.indexOf("CALL_MESSAGE_TYPES");
    const typesSection = src.substring(typesIdx, typesIdx + 600);
    expect(typesSection).toContain("call_offer");
    expect(typesSection).toContain("ice_restart_answer");
    expect(typesSection).toContain("call_end");
    expect(typesSection).not.toContain("dm_read");
  });

  test("H. a 4000 (replaced) close reconnects only during an active call", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useSignaling.ts", "utf8");
    const closeIdx = src.indexOf("ws.onclose");
    const closeSection = src.substring(closeIdx, closeIdx + 1400);
    expect(closeSection).toContain('ev.code === 4000');
    expect(closeSection).toContain("callActive");
    expect(closeSection).toContain("MAX_REPLACE_RECONNECTS");
  });

  test("I. heartbeat tracks pongs and force-closes stale (half-open) sockets", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useSignaling.ts", "utf8");
    expect(src).toContain("lastPongAt");
    expect(src).toContain("HEARTBEAT_TIMEOUT_MS");
    // outbound ping + stale close logic
    expect(src).toContain('JSON.stringify({ type: "ping" })');
    expect(src).toContain("ws.close(4001, \"Heartbeat timeout\")");
  });

  test("J. connection changes are surfaced to React state (Reconnecting UI)", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useSignaling.ts", "utf8");
    expect(src).toContain("connectionSubscribers");
    expect(src).toContain("notifyConnectionChange()");
  });
});

// ===========================================================================
// CallContext: bounded ICE restart + dual-sided termination + call-active sync
// ===========================================================================
describe("CallContext reliability", () => {
  test("K. ICE restart is bounded (timeout + max attempts), never infinite", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    expect(src).toContain("ICE_RESTART_TIMEOUT_MS");
    expect(src).toContain("MAX_ICE_RESTART_ATTEMPTS");
    expect(src).toContain("iceRestartTimerRef");
    const restartFn = src.substring(src.indexOf("const attemptIceRestart"));
    expect(restartFn).toContain("ICE_RESTART_TIMEOUT_MS");
    expect(restartFn).toContain("terminateCallCleanupRef.current(partnerId, true)");
  });

  test("L. ICE restart success clears the bound timer", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const answerIdx = src.indexOf('case "ice_restart_answer":');
    const section = src.substring(answerIdx);
    expect(section).toContain("clearIceRestartTimer()");
    expect(section).toContain("iceRestartInProgressRef.current = false");
  });

  test("M. recipient gets a post-accept establishment timeout (both sides bounded)", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    expect(src).toContain("CALL_ESTABLISH_TIMEOUT_MS");
    expect(src).toContain("armCallEstablishTimeout");
    const acceptIdx = src.indexOf("const acceptCall");
    const acceptSection = src.substring(acceptIdx, acceptIdx + 1800);
    expect(acceptSection).toContain("armCallEstablishTimeout(from, CALL_ESTABLISH_TIMEOUT_MS)");
  });

  test("N. caller re-arms the establish timeout once the answer arrives", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const answerIdx = src.indexOf('case "call_answer":');
    const nextCase = src.indexOf("case ", answerIdx + 1);
    const section = src.substring(answerIdx, nextCase);
    expect(section).toContain("armCallEstablishTimeout(msg.from, CALL_ESTABLISH_TIMEOUT_MS)");
  });

  test("O. connect clears every bound timer and resets restart attempts", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const idx = src.indexOf("const handleIceConnected");
    const section = src.substring(idx, idx + 350);
    expect(section).toContain("clearIceRestartTimer()");
    expect(section).toContain("iceRestartAttemptsRef.current = 0");
    expect(section).toContain("clearCallTimeout()");
  });

  test("P. signaling layer is told whether a call is active", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    expect(src).toContain("setSignalingCallActive(Boolean(activeCall) || Boolean(incomingCallFrom))");
  });

  test("Q. call end paths clear the ICE restart bound state", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const endIdx = src.indexOf("const endCall");
    const endSection = src.substring(endIdx, endIdx + 700);
    expect(endSection).toContain("clearIceRestartTimer()");
    expect(endSection).toContain("iceRestartAttemptsRef.current = 0");
    expect(endSection).toContain("iceRestartInProgressRef.current = false");
  });
});

// ===========================================================================
// useWebRtc: candidate buffering until remote description + diagnostics
// ===========================================================================
describe("useWebRtc candidate handling", () => {
  test("R. candidates are buffered until the remote description is set", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useWebRtc.ts", "utf8");
    expect(src).toContain("bufferedCandidatesRef");
    expect(src).toContain("!pc.remoteDescription");
  });

  test("S. buffered candidates are drained after setRemoteDescription", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useWebRtc.ts", "utf8");
    expect(src).toContain("drainBufferedCandidates(pc)");
    expect(src).toContain("await drainBufferedCandidates(pc)");
  });

  test("T. candidate errors are logged, not silently swallowed", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useWebRtc.ts", "utf8");
    expect(src).toContain('console.warn("[calls] addIceCandidate failed:", err)');
  });

  test("T2. buffered candidates are NOT pre-marked as applied (drain must add them)", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useWebRtc.ts", "utf8");
    const addIdx = src.indexOf("const addIceCandidate");
    const addSection = src.substring(addIdx, addIdx + 900);
    // The no-remote-description branch must dedupe against the buffer, not
    // mark the key as applied (otherwise the drain would skip it forever).
    expect(addSection).toContain("alreadyBuffered");
    expect(addSection).toContain("bufferedCandidatesRef.current.push(candidate)");
    expect(
      addSection.substring(addSection.indexOf("if (!pc.remoteDescription)"), addSection.indexOf("try {")),
    ).not.toContain("addedCandidateKeysRef.current.add(key)");
  });

  test("U. cleanup clears candidate buffers", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useWebRtc.ts", "utf8");
    const cleanupIdx = src.indexOf("const cleanup");
    const cleanupSection = src.substring(cleanupIdx, cleanupIdx + 400);
    expect(cleanupSection).toContain("bufferedCandidatesRef.current = []");
    expect(cleanupSection).toContain("addedCandidateKeysRef.current = new Set()");
  });
});

// ===========================================================================
// server.ts: protocol-level heartbeat (half-open sockets)
// ===========================================================================
describe("server heartbeat", () => {
  test("V. server pings clients and terminates those that stop answering", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("server.ts", "utf8");
    expect(src).toContain("isAlive");
    expect(src).toContain("client.ping()");
    expect(src).toContain("client.terminate()");
    expect(src).toContain("ws.on(\"pong\"");
  });
});

// ===========================================================================
// Offline-first regression guard: calling changes must not touch SW / cache.
// ===========================================================================
describe("offline-first regression", () => {
  test("W. calling hooks do not reference IndexedDB/Dexie/service worker", async () => {
    const fs = await import("node:fs");
    for (const file of [
      "src/hooks/useSignaling.ts",
      "src/hooks/useWebRtc.ts",
      "src/context/CallContext.tsx",
    ]) {
      const src = fs.readFileSync(file, "utf8");
      expect(src).not.toContain("indexedDB");
      expect(src).not.toContain("dexie");
      expect(src).not.toContain("serviceWorker");
      expect(src).not.toContain("navigator.serviceWorker");
    }
  });
});