"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useCall } from "@/context/CallContext";

interface CallUiValue {
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;
  speakerOn: boolean;
  setSpeakerOn: (v: boolean) => void;
}

const CallUiContext = createContext<CallUiValue | null>(null);

export function CallUiProvider({ children }: { children: ReactNode }) {
  const { activeCall } = useCall();
  const [isExpanded, setIsExpanded] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(false);

  useEffect(() => {
    if (activeCall) setIsExpanded(true);
  }, [activeCall?.partnerId]);

  useEffect(() => {
    if (!activeCall) setSpeakerOn(false);
  }, [activeCall]);

  return (
    <CallUiContext.Provider value={{ isExpanded, setIsExpanded, speakerOn, setSpeakerOn }}>
      {children}
    </CallUiContext.Provider>
  );
}

export function useCallUi() {
  const ctx = useContext(CallUiContext);
  if (!ctx) throw new Error("useCallUi must be used within CallUiProvider");
  return ctx;
}
