"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@/lib/types";

export interface ActiveCall {
  partner: User;
  startedAt: number;
}

interface CallContextValue {
  activeCall: ActiveCall | null;
  startCall: (partner: User) => void;
  endCall: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  const startCall = useCallback((partner: User) => {
    setActiveCall({ partner, startedAt: Date.now() });
  }, []);

  const endCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  return (
    <CallContext.Provider value={{ activeCall, startCall, endCall }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}
