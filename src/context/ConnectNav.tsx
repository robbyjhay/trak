"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type ConnectView = "messages" | "contacts";

interface ConnectNavValue {
  view: ConnectView;
  setView: (v: ConnectView) => void;
}

const ConnectNavContext = createContext<ConnectNavValue | null>(null);

export function ConnectNavProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ConnectView>("messages");
  return (
    <ConnectNavContext.Provider value={{ view, setView }}>
      {children}
    </ConnectNavContext.Provider>
  );
}

export function useConnectNav() {
  const ctx = useContext(ConnectNavContext);
  if (!ctx) throw new Error("useConnectNav must be used within ConnectNavProvider");
  return ctx;
}
