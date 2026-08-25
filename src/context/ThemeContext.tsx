"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  preview: Theme;
  setTheme: (t: Theme) => void;
  saveTheme: () => void;
  cancelPreview: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [preview, setPreview] = useState<Theme>("system");

  useEffect(() => {
    const saved = localStorage.getItem("trak-theme") as Theme | null;
    if (saved) {
      setThemeState(saved);
      setPreview(saved);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    
    let activeTheme = preview;
    if (activeTheme === "system") {
      activeTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    
    root.classList.add(activeTheme);
  }, [preview]);

  const setTheme = (t: Theme) => setPreview(t);
  
  const saveTheme = () => {
    setThemeState(preview);
    localStorage.setItem("trak-theme", preview);
  };
  
  const cancelPreview = () => {
    setPreview(theme);
  };

  return (
    <ThemeContext.Provider value={{ theme, preview, setTheme, saveTheme, cancelPreview }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
