"use client";

import { useEffect, useState } from "react";

/**
 * Returns the current epoch-ms timestamp and re-renders the consumer every
 * `intervalMs`. Used to keep relative "Last online X min ago" labels fresh
 * without re-rendering the whole tree each second.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}