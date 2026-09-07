"use client";

import { useCall } from "@/context/CallContext";
import { useTrak } from "@/context/TrakStore";
import { IncomingCallView } from "./IncomingCallView";

export function IncomingCallOverlay() {
  const { incomingCallFrom, acceptCall, rejectCall, activeCall } = useCall();
  const { userMap } = useTrak();

  if (!incomingCallFrom) return null;
  // If already in a call, don't show incoming (busy handled by server)
  if (activeCall) return null;

  const caller = userMap[incomingCallFrom];
  if (!caller) return null;

  return <IncomingCallView caller={caller} onAccept={() => void acceptCall()} onDecline={rejectCall} />;
}
