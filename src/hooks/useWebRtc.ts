"use client";

import { useCallback, useRef, useState } from "react";
import { callDebug } from "@/lib/callDebug";

const DEFAULT_STUN: RTCIceServer = { urls: "stun:stun.l.google.com:19302" };

/**
 * Build the ICE server list from environment configuration.
 *
 * The Google STUN server is always kept so peer-reflexive discovery still
 * works in development / when TURN is not configured. TURN servers are read
 * from env (comma-separated URLs) and are purely optional — an absent config
 * must not break local or dev calls.
 *
 * Browser bundles can only read NEXT_PUBLIC_* env values; the unprefixed
 * variants are supported as a build-time fallback.
 */
export function resolveIceServers(
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? ((process.env as Record<string, string | undefined>) ?? {})
    : {},
): RTCIceServer[] {
  const servers: RTCIceServer[] = [DEFAULT_STUN];
  const turnUrlRaw =
    env.NEXT_PUBLIC_TURN_URL || env.TURN_URL || "";
  const turnUrls = turnUrlRaw
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  if (turnUrls.length === 0) return servers;
  const username =
    env.NEXT_PUBLIC_TURN_USERNAME || env.TURN_USERNAME || "";
  const credential =
    env.NEXT_PUBLIC_TURN_CREDENTIAL || env.TURN_CREDENTIAL || "";
  servers.push({ urls: turnUrls, username, credential });
  callDebug("[calls] TURN configured", turnUrls.length, "server(s)");
  return servers;
}

/** How long to reuse a server-generated ICE config before refetching. */
const ICE_SERVERS_CACHE_MS = 5 * 60_000;

let cachedIceServers: { servers: RTCIceServer[]; fetchedAt: number } | null =
  null;

/**
 * Resolve the ICE server configuration for the next PeerConnection.
 *
 * Preferred source: the authenticated TRAK API `/api/calls/ice-servers`,
 * which returns short-lived STUN/TURN servers generated server-side from
 * Cloudflare Realtime — the TURN Token ID / API token never reach the
 * browser. When that is unavailable or returns nothing, this falls back to
 * the original behavior (Google STUN always, plus any build-time
 * NEXT_PUBLIC TURN config) so local/dev calls keep working.
 */
export async function getIceServers(
  now: number = Date.now(),
): Promise<RTCIceServer[]> {
  if (
    cachedIceServers &&
    now - cachedIceServers.fetchedAt < ICE_SERVERS_CACHE_MS
  ) {
    return cachedIceServers.servers;
  }

  let remote: RTCIceServer[] = [];
  try {
    const res = await fetch("/api/calls/ice-servers", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as { iceServers?: RTCIceServer[] };
      if (Array.isArray(data.iceServers)) remote = data.iceServers;
    }
  } catch (err) {
    callDebug("[calls] failed to fetch ICE servers", err);
  }

  if (remote.length > 0) {
    cachedIceServers = { servers: remote, fetchedAt: now };
    callDebug(
      "[calls] using server-generated ICE servers",
      remote.length,
      "server(s)",
    );
    return remote;
  }

  callDebug("[calls] falling back to default ICE servers");
  return resolveIceServers();
}

/** Test hook — clears the client-side ICE server cache. */
export function resetIceServersCache(): void {
  cachedIceServers = null;
}

/**
 * Diagnostics: when ICE connects, log the selected candidate-pair types so we
 * can confirm whether TURN relay ("relay") or a direct route ("host" /
 * "srflx") carried the call. Gated by callDebug — never logs credentials.
 */
async function logSelectedCandidatePairType(pc: RTCPeerConnection): Promise<void> {
  try {
    const stats = await pc.getStats();
    let localType = "unknown";
    let remoteType = "unknown";
    stats.forEach((report) => {
      if (report.type === "candidate-pair" && report.state === "succeeded") {
        const local = report.localCandidateId
          ? stats.get(report.localCandidateId)
          : undefined;
        const remote = report.remoteCandidateId
          ? stats.get(report.remoteCandidateId)
          : undefined;
        if (local && "candidateType" in local) localType = local.candidateType;
        if (remote && "candidateType" in remote) remoteType = remote.candidateType;
      }
    });
    callDebug(
      "[calls] ICE connected — selected pair type",
      "local:",
      localType,
      "remote:",
      remoteType,
    );
  } catch (err) {
    callDebug("[calls] failed to read ICE stats", err);
  }
}

/** How long to wait after ICE reports disconnection before declaring failure. */
const DISCONNECTED_TIMEOUT_MS = 10_000;

/**
 * Stable identity for an ICE candidate so the same candidate is never applied
 * twice (relevant when signaling replays queued ice_candidate messages).
 */
export function iceCandidateKey(candidate: RTCIceCandidateInit): string {
  return [
    candidate.candidate ?? "",
    candidate.sdpMid ?? "",
    typeof candidate.sdpMLineIndex === "number" ? String(candidate.sdpMLineIndex) : "",
  ].join("|");
}

export type PeerStatus =
  | "idle"
  | "requesting_media"
  | "connecting"
  | "connected"
  | "failed";

export function useWebRtc() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const disconnectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Candidates that arrived before the remote description was set. */
  const bufferedCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  /** Keys of candidates already applied (or queued) once. */
  const addedCandidateKeysRef = useRef<Set<string>>(new Set());
  const [status, setStatus] = useState<PeerStatus>("idle");

  // ---- helpers ----

  const clearDisconnectedTimer = useCallback(() => {
    if (disconnectedTimerRef.current) {
      clearTimeout(disconnectedTimerRef.current);
      disconnectedTimerRef.current = null;
    }
  }, []);

  const getLocalStream = useCallback(async (): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    streamRef.current = stream;
    return stream;
  }, []);

  const createPeerConnection = useCallback(
    async (
      onIceCandidate: (candidate: RTCIceCandidateInit) => void,
      onRemoteStream: (stream: MediaStream) => void,
      onConnected: () => void,
      onFailed: () => void,
    ) => {
      const iceServers = await getIceServers();
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;
      // Fresh PeerConnection — reset the candidate-tracking buffers.
      bufferedCandidatesRef.current = [];
      addedCandidateKeysRef.current = new Set();

      let gathered = 0;
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          gathered += 1;
          callDebug("[calls] ICE candidate gathered", gathered);
          onIceCandidate(e.candidate.toJSON());
        }
      };

      // ICE connection-state visibility (diagnostics only).
      pc.oniceconnectionstatechange = () => {
        callDebug("[calls] ICE connection state", pc.iceConnectionState);
        if (pc.iceConnectionState === "connected") {
          void logSelectedCandidatePairType(pc);
        }
      };

      pc.ontrack = (e) => {
        if (e.streams[0]) {
          if (!remoteAudioRef.current) {
            const audio = document.createElement("audio");
            audio.autoplay = true;
            audio.style.display = "none";
            document.body.appendChild(audio);
            remoteAudioRef.current = audio;
          }
          remoteAudioRef.current.srcObject = e.streams[0];
        }
      };

      // Handle connection state: only "connected" and "failed" are terminal.
      // Disconnected is potentially temporary — start a grace period timer.
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        callDebug("[calls] peer connection state", s);
        if (s === "connected") {
          clearDisconnectedTimer();
          setStatus("connected");
          onConnected();
        } else if (s === "disconnected") {
          // Potentially temporary — start a grace period timer.
          // If the connection recovers before the timer fires, we clear it.
          if (disconnectedTimerRef.current) return; // already counting down
          disconnectedTimerRef.current = setTimeout(() => {
            disconnectedTimerRef.current = null;
            // Timer expired without recovery — treat as failed.
            // Guard: only act if PC still exists and is still disconnected/failed.
            if (pcRef.current && (pcRef.current.connectionState === "disconnected" || pcRef.current.connectionState === "failed")) {
              setStatus("failed");
              onFailed();
            }
          }, DISCONNECTED_TIMEOUT_MS);
        } else if (s === "failed") {
          clearDisconnectedTimer();
          setStatus("failed");
          onFailed();
        } else if (s === "closed") {
          clearDisconnectedTimer();
        }
      };

      return pc;
    },
    [clearDisconnectedTimer],
  );

  const addLocalTracks = useCallback(
    (pc: RTCPeerConnection, stream: MediaStream) => {
      for (const track of stream.getAudioTracks()) {
        pc.addTrack(track, stream);
      }
    },
    [],
  );

  const createOffer = useCallback(
    async (
      pc: RTCPeerConnection,
    ): Promise<RTCSessionDescriptionInit> => {
      setStatus("connecting");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      return { type: "offer", sdp: offer.sdp || "" };
    },
    [],
  );

  /** Create a new offer with ICE restart enabled (does NOT create a new PC). */
  const createRestartOffer = useCallback(
    async (pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> => {
      pc.restartIce();
      setStatus("connecting");
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      return { type: "offer", sdp: offer.sdp || "" };
    },
    [],
  );

  /**
   * Apply (or queue) an ICE candidate. Candidates are buffered until the peer's
   * remote description is set; deduplicated so replayed signaling never applies
   * the same candidate twice; and failures are logged instead of swallowed.
   */
  const addIceCandidate = useCallback(
    async (pc: RTCPeerConnection, candidate: RTCIceCandidateInit) => {
      if (!candidate || typeof candidate.candidate !== "string") return;
      const key = iceCandidateKey(candidate);
      if (addedCandidateKeysRef.current.has(key)) {
        callDebug("[calls] duplicate ICE candidate skipped");
        return;
      }
      if (!pc.remoteDescription) {
        // Remote description not set yet — buffer for after setRemoteDescription.
        // (Do NOT mark as "added" here: the drain must actually apply it.)
        const alreadyBuffered = bufferedCandidatesRef.current.some(
          (c) => iceCandidateKey(c) === key,
        );
        if (!alreadyBuffered) {
          bufferedCandidatesRef.current.push(candidate);
          callDebug("[calls] ICE candidate buffered (no remote description)");
        }
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        addedCandidateKeysRef.current.add(key);
      } catch (err) {
        // ICE candidate errors are usually non-fatal, but they must not be
        // silently swallowed when they indicate a state mismatch.
        console.warn("[calls] addIceCandidate failed:", err);
      }
    },
    [],
  );

  const drainBufferedCandidates = useCallback(
    async (pc: RTCPeerConnection) => {
      const buffered = bufferedCandidatesRef.current;
      if (buffered.length === 0) return;
      bufferedCandidatesRef.current = [];
      callDebug("[calls] draining buffered ICE candidates", buffered.length);
      for (const candidate of buffered) {
        await addIceCandidate(pc, candidate);
      }
    },
    [addIceCandidate],
  );

  const handleOffer = useCallback(
    async (
      pc: RTCPeerConnection,
      sdp: RTCSessionDescriptionInit,
    ): Promise<RTCSessionDescriptionInit> => {
      setStatus("connecting");
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await drainBufferedCandidates(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return { type: "answer", sdp: answer.sdp || "" };
    },
    [drainBufferedCandidates],
  );

  const handleAnswer = useCallback(
    async (pc: RTCPeerConnection, sdp: RTCSessionDescriptionInit) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await drainBufferedCandidates(pc);
    },
    [drainBufferedCandidates],
  );

  const cleanup = useCallback(() => {
    clearDisconnectedTimer();
    bufferedCandidatesRef.current = [];
    addedCandidateKeysRef.current = new Set();
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setStatus("idle");
  }, [clearDisconnectedTimer]);

  /** Get the local audio track (for mute control). */
  const getLocalAudioTrack = useCallback((): MediaStreamTrack | null => {
    return streamRef.current?.getAudioTracks()[0] ?? null;
  }, []);

  /** Get the remote audio element (for speaker/sinkId control). */
  const getRemoteAudioElement = useCallback((): HTMLAudioElement | null => {
    return remoteAudioRef.current;
  }, []);

  return {
    status,
    getLocalStream,
    createPeerConnection,
    addLocalTracks,
    createOffer,
    createRestartOffer,
    handleOffer,
    handleAnswer,
    addIceCandidate,
    cleanup,
    getLocalAudioTrack,
    getRemoteAudioElement,
    getPeer: () => pcRef.current,
  };
}
