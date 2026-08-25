"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type ConnectView = "messages" | "contacts";

interface ConnectNavValue {
  view: ConnectView;
  setView: (v: ConnectView) => void;
  isMobileThreadOpen: boolean;
  setMobileThreadOpen: (v: boolean) => void;
}

const ConnectNavContext = createContext<ConnectNavValue | null>(null);

export function ConnectNavProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ConnectView>("messages");
  const [isMobileThreadOpen, setMobileThreadOpen] = useState(false);
  return (
    <ConnectNavContext.Provider value={{ view, setView, isMobileThreadOpen, setMobileThreadOpen }}>
      {children}
    </ConnectNavContext.Provider>
  );
}

export function useConnectNav() {
  const ctx = useContext(ConnectNavContext);
  if (!ctx) throw new Error("useConnectNav must be used within ConnectNavProvider");
  return ctx;
}
