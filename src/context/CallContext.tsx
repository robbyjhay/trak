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
  startCall: (partnerId: string) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

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
  const { onlineUsers, send, onMessage } = useSignaling(userId);
  const webrtc = useWebRtc();

  const ringtoneRef = useRef<AudioContext | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const partnerIdRef = useRef<string | null>(null);
  const activeCallRef = useRef<ActiveCall | null>(null);
  const sendRef = useRef(send);
  const webrtcRef = useRef(webrtc);

  // Keep refs current
  useEffect(() => { sendRef.current = send; }, [send]);
  useEffect(() => { webrtcRef.current = webrtc; }, [webrtc]);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

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

          w.createPeerConnection(
            (candidate) => s({ type: "ice_candidate", to: msg.from, candidate }),
            () => {},
            () => {},
            () => {},
          );

          (window as any).__pendingOffer = { sdp: msg.sdp, from: msg.from };
          break;
        }

        case "call_answer": {
          const pc = w.getPeer();
          if (!pc) return;
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
            pendingIceRef.current.push(msg.candidate);
            return;
          }
          await w.addIceCandidate(pc, msg.candidate);
          break;
        }

        case "call_accept": {
          stopRingtone(ringtoneRef.current);
          ringtoneRef.current = null;
          try {
            const stream = await w.getLocalStream();
            const pc = w.createPeerConnection(
              (candidate) => s({ type: "ice_candidate", to: msg.from, candidate }),
              () => {},
              () => setActiveCall((c) => c ? { ...c, status: "connected" } : null),
              () => { setActiveCall(null); w.cleanup(); },
            );
            w.addLocalTracks(pc, stream);
            const offer = await w.createOffer(pc);
            s({ type: "call_offer", to: msg.from, sdp: offer });
            setActiveCall((c) => c ? { ...c, status: "ringing" } : null);
          } catch {
            setActiveCall(null);
            w.cleanup();
          }
          break;
        }

        case "call_reject": {
          stopRingtone(ringtoneRef.current);
          ringtoneRef.current = null;
          setActiveCall(null);
          w.cleanup();
          break;
        }

        case "call_end": {
          stopRingtone(ringtoneRef.current);
          ringtoneRef.current = null;
          setActiveCall(null);
          setIncomingCallFrom(null);
          w.cleanup();
          break;
        }

        case "peer_busy":
        case "peer_unavailable": {
          stopRingtone(ringtoneRef.current);
          ringtoneRef.current = null;
          setActiveCall(null);
          w.cleanup();
          break;
        }
      }
    });
  }, [onMessage]);

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
        () => setActiveCall((c) => c ? { ...c, status: "connected" } : null),
        () => { setActiveCall(null); w.cleanup(); },
      );
      w.addLocalTracks(pc, stream);
      const offer = await w.createOffer(pc);
      s({ type: "call_offer", to: partnerId, sdp: offer });
    } catch {
      setActiveCall(null);
      webrtcRef.current.cleanup();
    }
  }, []);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    const pending = (window as any).__pendingOffer;
    if (!pending) return;
    delete (window as any).__pendingOffer;

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
        () => setActiveCall((c) => c ? { ...c, status: "connected" } : null),
        () => { setActiveCall(null); w.cleanup(); },
      );
      w.addLocalTracks(pc, stream);
      const answer = await w.handleOffer(pc, sdp);
      s({ type: "call_answer", to: from, sdp: answer });

      for (const c of pendingIceRef.current) {
        await w.addIceCandidate(pc, c);
      }
      pendingIceRef.current = [];
    } catch {
      setActiveCall(null);
      webrtcRef.current.cleanup();
    }
  }, []);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    const pending = (window as any).__pendingOffer;
    if (pending) {
      sendRef.current({ type: "call_reject", to: pending.from });
      delete (window as any).__pendingOffer;
    }
    stopRingtone(ringtoneRef.current);
    ringtoneRef.current = null;
    setIncomingCallFrom(null);
    pendingIceRef.current = [];
  }, []);

  // End active call
  const endCall = useCallback(() => {
    const partnerId = partnerIdRef.current;
    if (partnerId) {
      sendRef.current({ type: "call_end", to: partnerId });
    }
    stopRingtone(ringtoneRef.current);
    ringtoneRef.current = null;
    setActiveCall(null);
    setIncomingCallFrom(null);
    partnerIdRef.current = null;
    pendingIceRef.current = [];
    webrtcRef.current.cleanup();
  }, []);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        elapsedSec,
        incomingCallFrom,
        onlineUsers,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
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
