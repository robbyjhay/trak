"use client";
/* eslint-disable */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSignaling } from "@/hooks/useSignaling";
import { useWebRtc } from "@/hooks/useWebRtc";
import { useTrak } from "@/context/TrakStore";
import type { IncomingMessage } from "@/lib/signaling-types";

export type CallDirection = "outgoing" | "incoming";
export type CallStatus = "ringing" | "connected" | "ended";

export interface ActiveCall {
  partnerId: string;
  direction: CallDirection;
  status: CallStatus;
}

interface CallContextValue {
  activeCall: ActiveCall | null;
  elapsedSec: number;
  incomingCallFrom: string | null;
  onlineUsers: Set<string>;
  signalingConnected: boolean;
  presenceSynced: boolean;
  startCall: (partnerId: string) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => boolean;
  isMuted: boolean;
  setSpeakerSinkId: (sinkId: string) => Promise<void>;
  speakerSupported: boolean;
}

const CallContext = createContext<CallContextValue | null>(null);

const CALL_TIMEOUT_MS = 30_000;

function playRingtone(): AudioContext | null {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 440;
    gain.gain.value = 0.3;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.setValueAtTime(0, now + 0.4);
    gain.gain.setValueAtTime(0.3, now + 0.8);
    gain.gain.setValueAtTime(0, now + 1.2);
    gain.gain.setValueAtTime(0.3, now + 1.6);
    gain.gain.setValueAtTime(0, now + 2.0);
    const id = setInterval(() => {
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.setValueAtTime(0, t + 0.4);
      gain.gain.setValueAtTime(0.3, t + 0.8);
      gain.gain.setValueAtTime(0, t + 1.2);
      gain.gain.setValueAtTime(0.3, t + 1.6);
      gain.gain.setValueAtTime(0, t + 2.0);
    }, 2400);
    (ctx as any).__ringInterval = id;
    return ctx;
  } catch {
    return null;
  }
}

function stopRingtone(ctx: AudioContext | null) {
  if (!ctx) return;
  try {
    clearInterval((ctx as any).__ringInterval);
    ctx.close();
  } catch {}
}

export function CallProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [incomingCallFrom, setIncomingCallFrom] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const { onlineUsers, connected: signalingConnected, presenceSynced, send, onMessage } = useSignaling(userId);
  const webrtc = useWebRtc();
  const { showToast } = useTrak();

  const ringtoneRef = useRef<AudioContext | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const partnerIdRef = useRef<string | null>(null);
  const activeCallRef = useRef<ActiveCall | null>(null);
  const sendRef = useRef(send);
  const webrtcRef = useRef(webrtc);
  const showToastRef = useRef(showToast);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOfferRef = useRef<{ sdp: RTCSessionDescriptionInit; from: string } | null>(null);
  const iceRestartInProgressRef = useRef(false);
  const mutedRef = useRef(false);

  // Keep refs current
  useEffect(() => { sendRef.current = send; }, [send]);
  useEffect(() => { webrtcRef.current = webrtc; }, [webrtc]);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // Clear call timeout helper (idempotent)
  const clearCallTimeout = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  }, []);

  // ---- ICE restart ----
  const attemptIceRestart = useCallback(async (partnerId: string) => {
    if (iceRestartInProgressRef.current) return; // prevent concurrent restarts
    const w = webrtcRef.current;
    const s = sendRef.current;
    const pc = w.getPeer();
    if (!pc) return;

    iceRestartInProgressRef.current = true;
    try {
      const offer = await w.createRestartOffer(pc);
      s({ type: "ice_restart_offer", to: partnerId, sdp: offer });
    } catch (err) {
      console.error("ICE restart failed:", err);
      // Recovery ultimately failed — terminate the call cleanly
      iceRestartInProgressRef.current = false;
      s({ type: "call_end", to: partnerId });
      stopRingtone(ringtoneRef.current);
      ringtoneRef.current = null;
      setActiveCall(null);
      partnerIdRef.current = null;
      pendingIceRef.current = [];
      w.cleanup();
    }
  }, []);

  // ---- ICE failure handler (passed to useWebRtc) ----
  const handleIceFailed = useCallback(() => {
    const ac = activeCallRef.current;
    if (!ac || ac.status === "ended") return;
    // Attempt ICE restart if not already in progress
    void attemptIceRestart(ac.partnerId);
  }, [attemptIceRestart]);

  const handleIceConnected = useCallback(() => {
    iceRestartInProgressRef.current = false;
    clearCallTimeout();
    setActiveCall((c) => c ? { ...c, status: "connected" } : null);
  }, [clearCallTimeout]);

  // Listen for signaling messages (uses refs to avoid stale closures)
  useEffect(() => {
    onMessage(async (msg) => {
      const s = sendRef.current;
      const w = webrtcRef.current;
      const ac = activeCallRef.current;

      switch (msg.type) {
        case "call_offer": {
          if (ac) {
            s({ type: "call_reject", to: msg.from });
            return;
          }
          partnerIdRef.current = msg.from;
          setIncomingCallFrom(msg.from);
          ringtoneRef.current = playRingtone();
          pendingIceRef.current = [];

          // Do NOT create a PeerConnection here — only buffer the offer.
          // The real PC is created in acceptCall().
          pendingOfferRef.current = { sdp: msg.sdp, from: msg.from };
          break;
        }

        case "call_answer": {
          // Caller receives this after recipient accepts
          const pc = w.getPeer();
          if (!pc) return;
          // Ignore answer if call was already ended or timed out
          if (!ac || ac.status === "ended") return;
          clearCallTimeout();
          await w.handleAnswer(pc, msg.sdp);
          for (const c of pendingIceRef.current) {
            await w.addIceCandidate(pc, c);
          }
          pendingIceRef.current = [];
          break;
        }

        case "ice_candidate": {
          const pc = w.getPeer();
          if (!pc) {
            // No PC yet — buffer for later (recipient pre-accept, or caller pre-answer)
            pendingIceRef.current.push(msg.candidate);
            return;
          }
          await w.addIceCandidate(pc, msg.candidate);
          break;
        }

        case "ice_restart_offer": {
          // Remote peer's ICE failed and they sent a restart offer.
          // Process it like a new offer on the existing PeerConnection.
          const pc = w.getPeer();
          if (!pc) return;
          if (!ac || ac.status === "ended") return;
          const answer = await w.handleOffer(pc, msg.sdp);
          s({ type: "ice_restart_answer", to: msg.from, sdp: answer });
          break;
        }

        case "ice_restart_answer": {
          // We sent a restart offer, now we get the answer.
          const pc = w.getPeer();
          if (!pc) return;
          if (!ac || ac.status === "ended") return;
          await w.handleAnswer(pc, msg.sdp);
          iceRestartInProgressRef.current = false;
          break;
        }

        case "call_reject": {
          clearCallTimeout();
          stopRingtone(ringtoneRef.current);
          ringtoneRef.current = null;
          setActiveCall(null);
          w.cleanup();
          break;
        }

        case "call_end": {
          clearCallTimeout();
          stopRingtone(ringtoneRef.current);
          ringtoneRef.current = null;
          setActiveCall(null);
          setIncomingCallFrom(null);
          pendingOfferRef.current = null;
          pendingIceRef.current = [];
          iceRestartInProgressRef.current = false;
          w.cleanup();
          break;
        }

        case "peer_busy":
        case "peer_unavailable": {
          clearCallTimeout();
          stopRingtone(ringtoneRef.current);
          ringtoneRef.current = null;
          setActiveCall(null);
          w.cleanup();
          break;
        }
      }
    });
  }, [onMessage, clearCallTimeout]);

  // Timer
  useEffect(() => {
    if (!activeCall || activeCall.status !== "connected") return;
    setElapsedSec(0);
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [activeCall?.status]);

  // Start outgoing call
  const startCall = useCallback(async (partnerId: string) => {
    if (activeCallRef.current) return;
    setElapsedSec(0);
    setActiveCall({ partnerId, direction: "outgoing", status: "ringing" });
    partnerIdRef.current = partnerId;

    try {
      const w = webrtcRef.current;
      const s = sendRef.current;
      const stream = await w.getLocalStream();
      const pc = w.createPeerConnection(
        (candidate) => s({ type: "ice_candidate", to: partnerId, candidate }),
        () => {},
        handleIceConnected,
        handleIceFailed,
      );
      w.addLocalTracks(pc, stream);
      const offer = await w.createOffer(pc);
      s({ type: "call_offer", to: partnerId, sdp: offer });

      // Start unanswered-call timeout
      callTimeoutRef.current = setTimeout(() => {
        // Timeout fired — check if call was already answered/ended
        if (!activeCallRef.current || activeCallRef.current.status !== "ringing") return;
        s({ type: "call_end", to: partnerId });
        stopRingtone(ringtoneRef.current);
        ringtoneRef.current = null;
        setActiveCall(null);
        partnerIdRef.current = null;
        pendingIceRef.current = [];
        w.cleanup();
      }, CALL_TIMEOUT_MS);
    } catch (err: any) {
      console.error("startCall failed:", err);
      clearCallTimeout();
      showToastRef.current(
        "Call Failed",
        "Unable to access camera or microphone. Please check your browser permissions or ensure you are using a secure connection (HTTPS)."
      );
      setActiveCall(null);
      webrtcRef.current.cleanup();
    }
  }, [clearCallTimeout, handleIceConnected, handleIceFailed]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    const pending = pendingOfferRef.current;
    if (!pending) return;
    pendingOfferRef.current = null;

    stopRingtone(ringtoneRef.current);
    ringtoneRef.current = null;

    const { sdp, from } = pending;
    setIncomingCallFrom(null);
    setActiveCall({ partnerId: from, direction: "incoming", status: "ringing" });
    partnerIdRef.current = from;

    try {
      const w = webrtcRef.current;
      const s = sendRef.current;
      const stream = await w.getLocalStream();
      const pc = w.createPeerConnection(
        (candidate) => s({ type: "ice_candidate", to: from, candidate }),
        () => {},
        handleIceConnected,
        handleIceFailed,
      );
      w.addLocalTracks(pc, stream);
      const answer = await w.handleOffer(pc, sdp);
      s({ type: "call_answer", to: from, sdp: answer });

      // Drain all buffered ICE candidates into the real PeerConnection
      for (const c of pendingIceRef.current) {
        await w.addIceCandidate(pc, c);
      }
      pendingIceRef.current = [];
    } catch (err: any) {
      console.error("acceptCall failed:", err);
      showToastRef.current(
        "Call Failed",
        "Unable to access camera or microphone to answer the call."
      );
      setActiveCall(null);
      webrtcRef.current.cleanup();
    }
  }, [handleIceConnected, handleIceFailed]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    const pending = pendingOfferRef.current;
    if (pending) {
      sendRef.current({ type: "call_reject", to: pending.from });
      pendingOfferRef.current = null;
    }
    stopRingtone(ringtoneRef.current);
    ringtoneRef.current = null;
    setIncomingCallFrom(null);
    pendingIceRef.current = [];
  }, []);

  // End active call (cleanup-safe — idempotent)
  const endCall = useCallback(() => {
    clearCallTimeout();
    const partnerId = partnerIdRef.current;
    if (partnerId) {
      sendRef.current({ type: "call_end", to: partnerId });
    }
    stopRingtone(ringtoneRef.current);
    ringtoneRef.current = null;
    setActiveCall(null);
    setIncomingCallFrom(null);
    partnerIdRef.current = null;
    pendingOfferRef.current = null;
    pendingIceRef.current = [];
    iceRestartInProgressRef.current = false;
    setMuted(false);
    webrtcRef.current.cleanup();
  }, [clearCallTimeout]);

  // ---- Mute control ----
  const toggleMute = useCallback((): boolean => {
    const track = webrtcRef.current.getLocalAudioTrack();
    if (!track) return mutedRef.current;
    const newMuted = !mutedRef.current;
    track.enabled = !newMuted;
    setMuted(newMuted);
    return newMuted;
  }, []);

  // ---- Speaker control ----
  const speakerSupported = typeof HTMLAudioElement !== "undefined" &&
    typeof HTMLAudioElement.prototype.setSinkId === "function";

  const setSpeakerSinkId = useCallback(async (sinkId: string) => {
    const audio = webrtcRef.current.getRemoteAudioElement();
    if (!audio || !speakerSupported) return;
    try {
      await audio.setSinkId(sinkId);
    } catch (err) {
      console.warn("setSinkId failed:", err);
    }
  }, [speakerSupported]);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        elapsedSec,
        incomingCallFrom,
        onlineUsers,
        signalingConnected,
        presenceSynced,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        isMuted: muted,
        setSpeakerSinkId,
        speakerSupported,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}
