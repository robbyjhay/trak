"use client";

import { useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useCall } from "@/context/CallContext";
import { useTrak } from "@/context/TrakStore";
import { useCallUi } from "./CallUiContext";
import { ActiveCallView } from "./ActiveCallView";
import { IncomingCallView } from "./IncomingCallView";
import { CompactCallBar } from "./CompactCallBar";
import { formatDuration } from "@/lib/utils";

export function CallExperience() {
  const {
    activeCall,
    elapsedSec,
    incomingCallFrom,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    isMuted,
    setSpeakerSinkId,
    speakerSupported,
    signalingConnected,
    presenceSynced,
  } = useCall();
  const { userMap, showToast, recordCall } = useTrak();
  const { isExpanded, setIsExpanded, speakerOn, setSpeakerOn } = useCallUi();

  const partner = activeCall ? userMap[activeCall.partnerId] : null;
  const caller = incomingCallFrom ? userMap[incomingCallFrom] : null;

  const handleMute = useCallback(() => {
    toggleMute();
  }, [toggleMute]);

  const handleSpeaker = useCallback(async () => {
    if (!speakerSupported) return;
    const next = !speakerOn;
    setSpeakerOn(next);
    try {
      await setSpeakerSinkId("");
    } catch {}
  }, [speakerOn, speakerSupported, setSpeakerSinkId, setSpeakerOn]);

  const handleEnd = useCallback(() => {
    const dur = elapsedSec;
    const name = partner?.name ?? "Call";
    endCall();
    if (dur > 0 && partner) {
      const timer = formatDuration(dur);
      showToast("Call ended", `Call with ${name} lasted ${timer}.`);
      void recordCall(partner.id, dur).catch(() => {});
    } else if (partner) {
      showToast("Call ended", `Call with ${name} ended.`);
    }
    setIsExpanded(true);
    setSpeakerOn(false);
  }, [elapsedSec, endCall, partner, recordCall, showToast, setIsExpanded, setSpeakerOn]);

  const handleAccept = useCallback(() => {
    void acceptCall();
  }, [acceptCall]);

  const handleReject = useCallback(() => {
    rejectCall();
  }, [rejectCall]);

  return (
    <>
      <AnimatePresence>
        {caller && !activeCall && (
          <IncomingCallView key="incoming" caller={caller} onAccept={handleAccept} onDecline={handleReject} />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeCall && partner && activeCall.status !== "ended" ? (
          isExpanded ? (
            <ActiveCallView
              key="active-expanded"
              partner={partner}
              status={activeCall.status as "ringing" | "connected"}
              direction={activeCall.direction}
              elapsedSec={elapsedSec}
              isMuted={isMuted}
              speakerOn={speakerOn}
              speakerSupported={speakerSupported}
              onMute={handleMute}
              onSpeaker={handleSpeaker}
              onEnd={handleEnd}
              onMinimize={() => setIsExpanded(false)}
              signalingConnected={signalingConnected}
              presenceSynced={presenceSynced}
            />
          ) : (
            <CompactCallBar
              key="active-compact"
              partner={partner}
              status={activeCall.status as "ringing" | "connected"}
              direction={activeCall.direction}
              elapsedSec={elapsedSec}
              isMuted={isMuted}
              speakerOn={speakerOn}
              speakerSupported={speakerSupported}
              onMute={handleMute}
              onSpeaker={handleSpeaker}
              onEnd={handleEnd}
              onExpand={() => setIsExpanded(true)}
              signalingConnected={signalingConnected}
            />
          )
        ) : null}
      </AnimatePresence>
    </>
  );
}
