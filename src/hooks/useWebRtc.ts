"use client";

import { useCallback, useRef, useState } from "react";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

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
  const [status, setStatus] = useState<PeerStatus>("idle");

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

      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === "connected") {
          setStatus("connected");
          onConnected();
        } else if (s === "failed" || s === "disconnected") {
          setStatus("failed");
          onFailed();
        }
      };

      return pc;
    },
    [],
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
  }, []);

  return {
    status,
    getLocalStream,
    createPeerConnection,
    addLocalTracks,
    createOffer,
    handleOffer,
    handleAnswer,
    addIceCandidate,
    cleanup,
    getPeer: () => pcRef.current,
  };
}
