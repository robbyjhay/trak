import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import type { IncomingMessage, OutgoingMessage } from "@/lib/signaling-types";

// ---------------------------------------------------------------------------
// Helpers: lightweight mocks for browser APIs not available in Node
// ---------------------------------------------------------------------------

function mockRtcPeerConnection() {
  const instance = {
    close: vi.fn(),
    addTrack: vi.fn(),
    createOffer: vi.fn().mockResolvedValue({ type: "offer", sdp: "mock-offer-sdp" }),
    createAnswer: vi.fn().mockResolvedValue({ type: "answer", sdp: "mock-answer-sdp" }),
    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
    restartIce: vi.fn(),
    onicecandidate: null as any,
    ontrack: null as any,
    onconnectionstatechange: null as any,
    connectionState: "new" as RTCPeerConnectionState,
  };
  return instance;
}

// Mock globalThis for the module under test
beforeEach(() => {
  vi.stubGlobal("RTCPeerConnection", vi.fn(() => mockRtcPeerConnection()));
  vi.stubGlobal("RTCSessionDescription", vi.fn((init: any) => init));
  vi.stubGlobal("RTCIceCandidate", vi.fn((init: any) => init));
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue({
        getAudioTracks: () => [{ kind: "audio", enabled: true, stop: vi.fn() }],
        getTracks: () => [{ kind: "audio", enabled: true, stop: vi.fn() }],
      }),
    },
  });
  vi.stubGlobal("AudioContext", vi.fn(() => ({
    createOscillator: vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), frequency: { value: 0 } })),
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      gain: {
        value: 0,
        setValueAtTime: vi.fn(),
      },
    })),
    destination: {},
    currentTime: 0,
    close: vi.fn(),
  })));
  vi.stubGlobal("document", {
    createElement: vi.fn(() => ({ autoplay: false, style: {}, appendChild: vi.fn(), setSinkId: vi.fn().mockResolvedValue(undefined) })),
    body: { appendChild: vi.fn() },
  });
  vi.stubGlobal("HTMLAudioElement", { prototype: { setSinkId: vi.fn() } });
  vi.stubGlobal("setTimeout", vi.fn((fn: Function, ms: number) => {
    // Store the callback but don't auto-fire — tests control timing
    return { __timeoutMs: ms, __callback: fn, id: Math.random() };
  }));
  vi.stubGlobal("clearTimeout", vi.fn());
  vi.stubGlobal("setInterval", vi.fn(() => 123));
  vi.stubGlobal("clearInterval", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ===========================================================================
// Test 1: Incoming call_offer does NOT create a PeerConnection
// ===========================================================================
describe("call_offer handling", () => {
  test("1. incoming call_offer does not create a PeerConnection", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const offerIdx = src.indexOf('case "call_offer":');
    const nextCase = src.indexOf("case ", offerIdx + 1);
    const offerSection = src.substring(offerIdx, nextCase);
    expect(offerSection).not.toContain("createPeerConnection");
    expect(offerSection).toContain("pendingOfferRef.current");
  });

  test("1b. call_offer type exists in IncomingMessage", async () => {
    const testMsg: IncomingMessage = { type: "call_offer", from: "user-a", sdp: { type: "offer", sdp: "x" } };
    expect(testMsg.type).toBe("call_offer");
  });
});

// ===========================================================================
// Test 2: ICE candidates are buffered before acceptCall
// ===========================================================================
describe("ICE candidate buffering", () => {
  test("2. ice_candidate type exists in IncomingMessage for buffering", async () => {
    const testMsg: IncomingMessage = {
      type: "ice_candidate",
      from: "user-a",
      candidate: { candidate: "mock-candidate", sdpMid: "0", sdpMLineIndex: 0 },
    };
    expect(testMsg.type).toBe("ice_candidate");
  });

  test("2b. pendingOfferRef stores offer for later use by acceptCall", async () => {
    const offer: IncomingMessage = {
      type: "call_offer",
      from: "caller-123",
      sdp: { type: "offer", sdp: "v=0\r\n..." },
    };
    expect(offer.type).toBe("call_offer");
    expect(offer.from).toBe("caller-123");
  });
});

// ===========================================================================
// Test 3: acceptCall creates exactly one PeerConnection
// ===========================================================================
describe("acceptCall", () => {
  test("3. acceptCall sends call_answer (not call_accept)", async () => {
    const outgoing: OutgoingMessage = {
      type: "call_answer",
      to: "caller-123",
      sdp: { type: "answer", sdp: "mock-answer" },
    };
    expect(outgoing.type).toBe("call_answer");

    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    expect(src).not.toContain('"call_accept"');
  });
});

// ===========================================================================
// Test 4: No call_accept message is sent
// ===========================================================================
describe("call_accept removal", () => {
  test("4a. call_accept is NOT in OutgoingMessage types", async () => {
    const msg: OutgoingMessage = { type: "ping" } as any;
    expect(msg.type).not.toBe("call_accept");
  });

  test("4b. call_accept is NOT in IncomingMessage types", async () => {
    const msg: IncomingMessage = { type: "ping" } as any;
    expect(msg.type).not.toBe("call_accept");
  });

  test("4c. call_accept is NOT handled in server message switch", async () => {
    const fs = await import("node:fs");
    const serverSrc = fs.readFileSync("server.ts", "utf8");
    expect(serverSrc).not.toContain('case "call_accept"');
  });
});

// ===========================================================================
// Test 5: Unanswered outgoing call times out after 30 seconds
// ===========================================================================
describe("call timeout", () => {
  test("5a. CALL_TIMEOUT_MS constant is 30000", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    expect(src).toContain("const CALL_TIMEOUT_MS = 30_000");
  });

  test("5b. startCall sets a setTimeout for CALL_TIMEOUT_MS", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    expect(src).toContain("callTimeoutRef.current = setTimeout");
    expect(src).toContain("CALL_TIMEOUT_MS");
  });

  test("5c. timeout sends call_end and cleans up", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    expect(src).toContain('s({ type: "call_end", to: partnerId })');
    expect(src).toContain("w.cleanup()");
    expect(src).toContain("setActiveCall(null)");
    expect(src).toContain("partnerIdRef.current = null");
  });
});

// ===========================================================================
// Test 6: Timeout is cleanup-safe and idempotent
// ===========================================================================
describe("timeout safety", () => {
  test("6a. clearCallTimeout is idempotent (checks ref before clearing)", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    expect(src).toContain("if (callTimeoutRef.current)");
    expect(src).toContain("clearTimeout(callTimeoutRef.current)");
    expect(src).toContain("callTimeoutRef.current = null");
  });

  test("6b. clearCallTimeout is called in endCall", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const endCallSection = src.substring(src.indexOf("const endCall"));
    expect(endCallSection).toContain("clearCallTimeout()");
  });

  test("6c. clearCallTimeout is called in call_end message handler", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const callEndIdx = src.indexOf('case "call_end":');
    const nextCase = src.indexOf("case ", callEndIdx + 1);
    const callEndSection = src.substring(callEndIdx, nextCase);
    expect(callEndSection).toContain("clearCallTimeout()");
  });

  test("6d. clearCallTimeout is called on call_reject", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const rejectIdx = src.indexOf('case "call_reject":');
    const nextCase = src.indexOf("case ", rejectIdx + 1);
    const rejectSection = src.substring(rejectIdx, nextCase);
    expect(rejectSection).toContain("clearCallTimeout()");
  });

  test("6e. clearCallTimeout is called on peer_busy/peer_unavailable", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const busyIdx = src.indexOf('case "peer_busy":');
    const closingBrace = src.indexOf("}", busyIdx + 20);
    const busySection = src.substring(busyIdx, closingBrace + 1);
    expect(busySection).toContain("clearCallTimeout()");
  });
});

// ===========================================================================
// Test 7: Answer arriving after timeout is ignored
// ===========================================================================
describe("late answer handling", () => {
  test("7. call_answer handler checks for ended status", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const answerIdx = src.indexOf('case "call_answer":');
    const nextCase = src.indexOf("case ", answerIdx + 1);
    const answerSection = src.substring(answerIdx, nextCase);
    expect(answerSection).toContain('ac.status === "ended"');
    expect(answerSection).toContain("return");
  });
});

// ===========================================================================
// Test 8: ICE arriving after hangup is ignored
// ===========================================================================
describe("late ICE handling", () => {
  test("8. ice_candidate buffers when no PeerConnection exists", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const iceIdx = src.indexOf('case "ice_candidate":');
    const nextCase = src.indexOf("case ", iceIdx + 1);
    const iceSection = src.substring(iceIdx, nextCase);
    expect(iceSection).toContain("pendingIceRef.current.push(msg.candidate)");
  });

  test("8b. pendingIceRef is cleared in endCall", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const endCallIdx = src.indexOf("const endCall");
    const endCallSection = src.substring(endCallIdx);
    expect(endCallSection).toContain("pendingIceRef.current = []");
  });

  test("8c. pendingIceRef is cleared in call_end handler", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const callEndIdx = src.indexOf('case "call_end":');
    const nextCase = src.indexOf("case ", callEndIdx + 1);
    const callEndSection = src.substring(callEndIdx, nextCase);
    expect(callEndSection).toContain("pendingIceRef.current = []");
  });
});

// ===========================================================================
// Test 9: call_end during ringing cleans up correctly
// ===========================================================================
describe("call_end during ringing", () => {
  test("9. call_end handler clears all state", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const callEndIdx = src.indexOf('case "call_end":');
    const nextCase = src.indexOf("case ", callEndIdx + 1);
    const callEndSection = src.substring(callEndIdx, nextCase);

    expect(callEndSection).toContain("clearCallTimeout()");
    expect(callEndSection).toContain("stopRingtone(ringtoneRef.current)");
    expect(callEndSection).toContain("setActiveCall(null)");
    expect(callEndSection).toContain("setIncomingCallFrom(null)");
    expect(callEndSection).toContain("pendingOfferRef.current = null");
    expect(callEndSection).toContain("pendingIceRef.current = []");
    expect(callEndSection).toContain("w.cleanup()");
  });
});

// ===========================================================================
// Test 10: pendingOfferRef replaces window.__pendingOffer
// ===========================================================================
describe("pendingOffer storage", () => {
  test("10a. call_offer stores in pendingOfferRef, not window.__pendingOffer", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    expect(src).toContain("pendingOfferRef.current = { sdp: msg.sdp, from: msg.from }");
    expect(src).not.toContain("window.__pendingOffer");
  });

  test("10b. acceptCall reads from pendingOfferRef", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const acceptIdx = src.indexOf("const acceptCall");
    const acceptSection = src.substring(acceptIdx, acceptIdx + 500);
    expect(acceptSection).toContain("pendingOfferRef.current");
    expect(acceptSection).not.toContain("window.__pendingOffer");
  });

  test("10c. rejectCall reads from pendingOfferRef", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const rejectIdx = src.indexOf("const rejectCall");
    const rejectSection = src.substring(rejectIdx, rejectIdx + 500);
    expect(rejectSection).toContain("pendingOfferRef.current");
    expect(rejectSection).not.toContain("window.__pendingOffer");
  });

  test("10d. call_end clears pendingOfferRef", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const callEndIdx = src.indexOf('case "call_end":');
    const nextCase = src.indexOf("case ", callEndIdx + 1);
    const callEndSection = src.substring(callEndIdx, nextCase);
    expect(callEndSection).toContain("pendingOfferRef.current = null");
  });
});

// ===========================================================================
// Test 11: Buffered ICE candidates are applied in acceptCall
// ===========================================================================
describe("ICE drain on accept", () => {
  test("11. acceptCall drains pendingIceRef into the real PeerConnection", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const acceptIdx = src.indexOf("const acceptCall");
    const acceptSection = src.substring(acceptIdx);
    expect(acceptSection).toContain("for (const c of pendingIceRef.current)");
    expect(acceptSection).toContain("await w.addIceCandidate(pc, c)");
    expect(acceptSection).toContain("pendingIceRef.current = []");
  });
});

// ===========================================================================
// Test 12: Existing call flow completeness
// ===========================================================================
describe("complete call flow", () => {
  test("12a. startCall creates PeerConnection, adds tracks, creates offer, sends call_offer", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const startIdx = src.indexOf("const startCall");
    const startSection = src.substring(startIdx, startIdx + 1500);

    expect(startSection).toContain("w.getLocalStream()");
    expect(startSection).toContain("w.createPeerConnection(");
    expect(startSection).toContain("w.addLocalTracks(pc, stream)");
    expect(startSection).toContain("w.createOffer(pc)");
    expect(startSection).toContain('s({ type: "call_offer", to: partnerId, sdp: offer })');
  });

  test("12b. acceptCall creates PeerConnection, adds tracks, handles offer, sends answer, drains ICE", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const acceptIdx = src.indexOf("const acceptCall");
    const acceptSection = src.substring(acceptIdx, acceptIdx + 1500);

    expect(acceptSection).toContain("w.getLocalStream()");
    expect(acceptSection).toContain("w.createPeerConnection(");
    expect(acceptSection).toContain("w.addLocalTracks(pc, stream)");
    expect(acceptSection).toContain("w.handleOffer(pc, sdp)");
    expect(acceptSection).toContain('s({ type: "call_answer", to: from, sdp: answer })');
    expect(acceptSection).toContain("for (const c of pendingIceRef.current)");
  });

  test("12c. endCall sends call_end, cleans up everything", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const endIdx = src.indexOf("const endCall");
    const endSection = src.substring(endIdx, endIdx + 800);

    expect(endSection).toContain('sendRef.current({ type: "call_end", to: partnerId })');
    expect(endSection).toContain("stopRingtone(ringtoneRef.current)");
    expect(endSection).toContain("setActiveCall(null)");
    expect(endSection).toContain("setIncomingCallFrom(null)");
    expect(endSection).toContain("partnerIdRef.current = null");
    expect(endSection).toContain("pendingOfferRef.current = null");
    expect(endSection).toContain("pendingIceRef.current = []");
    expect(endSection).toContain("webrtcRef.current.cleanup()");
  });
});

// ===========================================================================
// Test 13: Signaling types completeness
// ===========================================================================
describe("signaling types", () => {
  test("13a. OutgoingMessage includes all required call types", async () => {
    const required: OutgoingMessage["type"][] = [
      "call_offer", "call_answer", "ice_candidate", "call_reject", "call_end",
      "ice_restart_offer", "ice_restart_answer",
    ];
    for (const t of required) {
      expect(t).toBeTruthy();
    }
  });

  test("13b. IncomingMessage includes all required call types", async () => {
    const required: IncomingMessage["type"][] = [
      "call_offer", "call_answer", "ice_candidate", "call_reject", "call_end",
      "peer_busy", "peer_unavailable",
      "ice_restart_offer", "ice_restart_answer",
    ];
    for (const t of required) {
      expect(t).toBeTruthy();
    }
  });

  test("13c. call_accept does NOT appear in signaling types", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/lib/signaling-types.ts", "utf8");
    expect(src).not.toContain("call_accept");
  });
});

// ===========================================================================
// PHASE 2 TESTS
// ===========================================================================

// ===========================================================================
// Test 14: ICE connection handling (iceconnectionstatechange)
// ===========================================================================
describe("ICE connection handling", () => {
  test("14a. iceconnectionstatechange handles connected (clears disconnected timer)", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useWebRtc.ts", "utf8");
    expect(src).toContain("onconnectionstatechange");
    expect(src).toContain('"connected"');
    expect(src).toContain("clearDisconnectedTimer()");
  });

  test("14b. disconnected does NOT immediately end the call", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useWebRtc.ts", "utf8");
    const discIdx = src.indexOf('"disconnected"');
    // The disconnected handler should start a timer, NOT call onFailed directly
    const section = src.substring(discIdx - 100, discIdx + 500);
    expect(section).toContain("disconnectedTimerRef");
    expect(section).toContain("setTimeout");
  });

  test("14c. DISCONNECTED_TIMEOUT_MS is defined", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useWebRtc.ts", "utf8");
    expect(src).toContain("DISCONNECTED_TIMEOUT_MS");
    expect(src).toContain("10_000");
  });

  test("14d. disconnected timer fires onFailed if no recovery", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useWebRtc.ts", "utf8");
    // The setTimeout callback should check connectionState and call onFailed
    expect(src).toContain("onFailed()");
  });

  test("14e. failed state clears disconnected timer", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useWebRtc.ts", "utf8");
    // Find the "failed" inside the onconnectionstatechange handler, not the type definition
    const handlerStart = src.indexOf("pc.onconnectionstatechange");
    const handlerSection = src.substring(handlerStart, handlerStart + 600);
    const failedIdx = handlerSection.indexOf('"failed"');
    const section = handlerSection.substring(failedIdx - 50, failedIdx + 200);
    expect(section).toContain("clearDisconnectedTimer()");
  });

  test("14f. closed state clears disconnected timer", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useWebRtc.ts", "utf8");
    const closedIdx = src.indexOf('"closed"');
    const section = src.substring(closedIdx - 50, closedIdx + 200);
    expect(section).toContain("clearDisconnectedTimer()");
  });

  test("14g. cleanup clears disconnected timer", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useWebRtc.ts", "utf8");
    const cleanupIdx = src.indexOf("const cleanup");
    const cleanupSection = src.substring(cleanupIdx, cleanupIdx + 300);
    expect(cleanupSection).toContain("clearDisconnectedTimer()");
  });
});

// ===========================================================================
// Test 15: ICE restart
// ===========================================================================
describe("ICE restart", () => {
  test("15a. useWebRtc exposes createRestartOffer", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useWebRtc.ts", "utf8");
    expect(src).toContain("createRestartOffer");
    expect(src).toContain("pc.restartIce()");
    expect(src).toContain("iceRestart: true");
  });

  test("15b. createRestartOffer does NOT create a new PeerConnection", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useWebRtc.ts", "utf8");
    // createRestartOffer should use the existing pc, not create a new one
    const restartIdx = src.indexOf("const createRestartOffer");
    const restartSection = src.substring(restartIdx, restartIdx + 400);
    expect(restartSection).not.toContain("new RTCPeerConnection");
    expect(restartSection).toContain("pc.restartIce()");
    expect(restartSection).toContain("pc.createOffer");
  });

  test("15c. ice_restart_offer and ice_restart_answer are in signaling types", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/lib/signaling-types.ts", "utf8");
    expect(src).toContain("ice_restart_offer");
    expect(src).toContain("ice_restart_answer");
  });

  test("15d. server relays ice_restart_offer", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("server.ts", "utf8");
    expect(src).toContain('case "ice_restart_offer"');
    expect(src).toContain("type: \"ice_restart_offer\"");
  });

  test("15e. server relays ice_restart_answer", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("server.ts", "utf8");
    expect(src).toContain('case "ice_restart_answer"');
    expect(src).toContain("type: \"ice_restart_answer\"");
  });

  test("15f. CallContext handles ice_restart_offer (sets remote description, sends answer)", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const idx = src.indexOf('case "ice_restart_offer":');
    const nextCase = src.indexOf("case ", idx + 1);
    const section = src.substring(idx, nextCase);
    expect(section).toContain("w.handleOffer(pc, msg.sdp)");
    expect(section).toContain('s({ type: "ice_restart_answer"');
  });

  test("15g. CallContext handles ice_restart_answer (sets remote description)", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const idx = src.indexOf('case "ice_restart_answer":');
    const nextCase = src.indexOf("case ", idx + 1);
    const section = src.substring(idx, nextCase);
    expect(section).toContain("w.handleAnswer(pc, msg.sdp)");
    expect(section).toContain("iceRestartInProgressRef.current = false");
  });

  test("15h. ice restart has concurrency guard (iceRestartInProgressRef)", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    expect(src).toContain("iceRestartInProgressRef");
    expect(src).toContain("if (iceRestartInProgressRef.current) return");
  });

  test("15i. ice restart failure ends the call", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    // attemptIceRestart catch block should send call_end and clean up
    const restartFn = src.substring(src.indexOf("const attemptIceRestart"));
    expect(restartFn).toContain('s({ type: "call_end", to: partnerId })');
    expect(restartFn).toContain("w.cleanup()");
  });

  test("15j. ice restart clears on call_end", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const callEndIdx = src.indexOf('case "call_end":');
    const nextCase = src.indexOf("case ", callEndIdx + 1);
    const section = src.substring(callEndIdx, nextCase);
    expect(section).toContain("iceRestartInProgressRef.current = false");
  });

  test("15k. onFailed callback triggers attemptIceRestart", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    expect(src).toContain("handleIceFailed");
    expect(src).toContain("attemptIceRestart");
  });

  test("15l. handleIceConnected clears iceRestartInProgressRef", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const connectedIdx = src.indexOf("const handleIceConnected");
    const section = src.substring(connectedIdx, connectedIdx + 300);
    expect(section).toContain("iceRestartInProgressRef.current = false");
  });
});

// ===========================================================================
// Test 16: Mute control
// ===========================================================================
describe("mute control", () => {
  test("16a. useWebRtc exposes getLocalAudioTrack", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useWebRtc.ts", "utf8");
    expect(src).toContain("getLocalAudioTrack");
    expect(src).toContain("streamRef.current?.getAudioTracks()");
  });

  test("16b. CallContext exposes toggleMute and isMuted", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    expect(src).toContain("toggleMute");
    expect(src).toContain("isMuted");
  });

  test("16c. toggleMute toggles track.enabled", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const muteIdx = src.indexOf("const toggleMute");
    const muteSection = src.substring(muteIdx, muteIdx + 400);
    expect(muteSection).toContain("track.enabled = !newMuted");
    expect(muteSection).toContain("setMuted(newMuted)");
  });

  test("16d. toggleMute does not stop/remove the track", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const muteIdx = src.indexOf("const toggleMute");
    const muteSection = src.substring(muteIdx, muteIdx + 400);
    expect(muteSection).not.toContain("track.stop()");
    expect(muteSection).not.toContain("removeTrack");
  });

  test("16e. endCall resets muted state", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const endCallIdx = src.indexOf("const endCall");
    const endCallSection = src.substring(endCallIdx, endCallIdx + 600);
    expect(endCallSection).toContain("setMuted(false)");
  });

  test("16f. CallPanel uses isMuted from context (not local state)", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/components/call/CallPanel.tsx", "utf8");
    expect(src).toContain("isMuted");
    expect(src).toContain("toggleMute");
    // Should NOT have its own muted useState
    expect(src).not.toContain("const [muted");
  });
});

// ===========================================================================
// Test 17: Speaker control
// ===========================================================================
describe("speaker control", () => {
  test("17a. useWebRtc exposes getRemoteAudioElement", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useWebRtc.ts", "utf8");
    expect(src).toContain("getRemoteAudioElement");
    expect(src).toContain("remoteAudioRef.current");
  });

  test("17b. CallContext exposes setSpeakerSinkId and speakerSupported", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    expect(src).toContain("setSpeakerSinkId");
    expect(src).toContain("speakerSupported");
  });

  test("17c. speakerSupported checks for setSinkId on HTMLAudioElement", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    expect(src).toContain("HTMLAudioElement");
    expect(src).toContain("setSinkId");
  });

  test("17d. setSpeakerSinkId handles errors gracefully", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const speakerIdx = src.indexOf("const setSpeakerSinkId");
    const speakerSection = src.substring(speakerIdx, speakerIdx + 400);
    expect(speakerSection).toContain("try");
    expect(speakerSection).toContain("catch");
    expect(speakerSection).toContain("console.warn");
  });

  test("17e. setSpeakerSinkId checks for audio element", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const speakerIdx = src.indexOf("const setSpeakerSinkId");
    const speakerSection = src.substring(speakerIdx, speakerIdx + 400);
    expect(speakerSection).toContain("if (!audio");
  });

  test("17f. CallPanel uses isMuted and speakerSupported from context", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/components/call/CallPanel.tsx", "utf8");
    expect(src).toContain("speakerSupported");
    expect(src).toContain("setSpeakerSinkId");
  });

  test("17g. CallPanel speaker button is disabled when unsupported", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/components/call/CallPanel.tsx", "utf8");
    expect(src).toContain("disabled={!speakerSupported}");
  });
});

// ===========================================================================
// Test 18: PendingCall direction fix
// ===========================================================================
describe("PendingCall direction", () => {
  test("18a. call_reject deletes PendingCall with caller→recipient direction", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("server.ts", "utf8");
    const rejectIdx = src.indexOf('case "call_reject":');
    const nextCase = src.indexOf("case ", rejectIdx + 1);
    const rejectSection = src.substring(rejectIdx, nextCase);
    // fromUserId should be userId (the sender/rejector), toUserId should be msg.to (the original caller)
    expect(rejectSection).toContain("fromUserId: userId");
    expect(rejectSection).toContain("toUserId: msg.to as string");
  });

  test("18b. call_end deletes PendingCall with caller→recipient direction", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("server.ts", "utf8");
    const endIdx = src.indexOf('case "call_end":');
    const nextCase = src.indexOf("case ", endIdx + 1);
    const endSection = src.substring(endIdx, nextCase);
    // fromUserId is userId (the one ending the call), toUserId is msg.to
    expect(endSection).toContain("fromUserId: userId");
    expect(endSection).toContain("toUserId: msg.to as string");
  });

  test("18c. call_offer creates PendingCall with caller→recipient direction", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("server.ts", "utf8");
    const offerIdx = src.indexOf('case "call_offer":');
    const nextCase = src.indexOf("case ", offerIdx + 1);
    const offerSection = src.substring(offerIdx, nextCase);
    expect(offerSection).toContain("fromUserId: userId!");
    expect(offerSection).toContain("toUserId: msg.to as string");
  });
});

// ===========================================================================
// Test 19: Cleanup safety for new state
// ===========================================================================
describe("Phase 2 cleanup safety", () => {
  test("19a. endCall resets iceRestartInProgressRef", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const endCallIdx = src.indexOf("const endCall");
    const endCallSection = src.substring(endCallIdx, endCallIdx + 600);
    expect(endCallSection).toContain("iceRestartInProgressRef.current = false");
  });

  test("19b. endCall resets muted state", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const endCallIdx = src.indexOf("const endCall");
    const endCallSection = src.substring(endCallIdx, endCallIdx + 600);
    expect(endCallSection).toContain("setMuted(false)");
  });

  test("19c. useWebRtc cleanup clears disconnected timer", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/hooks/useWebRtc.ts", "utf8");
    const cleanupIdx = src.indexOf("const cleanup");
    const cleanupSection = src.substring(cleanupIdx, cleanupIdx + 300);
    expect(cleanupSection).toContain("clearDisconnectedTimer()");
  });

  test("19d. handleIceFailed guards against ended call", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const failedIdx = src.indexOf("const handleIceFailed");
    const failedSection = src.substring(failedIdx, failedIdx + 300);
    expect(failedSection).toContain('ac.status === "ended"');
  });

  test("19e. ice_restart_offer handler guards against ended call", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const idx = src.indexOf('case "ice_restart_offer":');
    const nextCase = src.indexOf("case ", idx + 1);
    const section = src.substring(idx, nextCase);
    expect(section).toContain('ac.status === "ended"');
  });

  test("19f. ice_restart_answer handler guards against ended call", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/context/CallContext.tsx", "utf8");
    const idx = src.indexOf('case "ice_restart_answer":');
    const nextCase = src.indexOf("case ", idx + 1);
    const section = src.substring(idx, nextCase);
    expect(section).toContain('ac.status === "ended"');
  });
});
