"use client";

import { useCallback, useRef, useState } from "react";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

/** How long to wait after ICE goes "disconnected" before declaring failure. */
const DISCONNECTED_TIMEOUT_MS = 10_000;

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
    (
      onIceCandidate: (candidate: RTCIceCandidateInit) => void,
      onRemoteStream: (stream: MediaStream) => void,
      onConnected: () => void,
      onFailed: () => void,
    ) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          onIceCandidate(e.candidate.toJSON());
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
      // "disconnected" gets a grace period before triggering failure.
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
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

  const handleOffer = useCallback(
    async (
      pc: RTCPeerConnection,
      sdp: RTCSessionDescriptionInit,
    ): Promise<RTCSessionDescriptionInit> => {
      setStatus("connecting");
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return { type: "answer", sdp: answer.sdp || "" };
    },
    [],
  );

  const handleAnswer = useCallback(
    async (pc: RTCPeerConnection, sdp: RTCSessionDescriptionInit) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    },
    [],
  );

  const addIceCandidate = useCallback(
    async (pc: RTCPeerConnection, candidate: RTCIceCandidateInit) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ICE candidate errors are usually non-fatal
      }
    },
    [],
  );

  const cleanup = useCallback(() => {
    clearDisconnectedTimer();
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
