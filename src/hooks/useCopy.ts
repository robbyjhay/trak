"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { copyToClipboard } from "@/lib/utils";

export type UseCopyOptions = {
  /** Duration success state stays visible (ms). Default 1600 */
  duration?: number;
  onSuccess?: () => void;
  onError?: (err: unknown) => void;
};

/**
 * Reusable copy hook — single source of truth for all TRAK copy actions.
 * - Wraps shared `copyToClipboard` utility
 * - Exposes `copied` boolean that auto-resets after `duration`
 * - Safe for rapid repeated clicks (timer reset)
 * - No layout shift; animation is handled by consumer.
 */
export function useCopy(options: UseCopyOptions = {}) {
  const { duration = 1600, onSuccess, onError } = options;
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await copyToClipboard(text);
        setCopied(true);
        onSuccess?.();
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), duration);
        return true;
      } catch (err) {
        setCopied(false);
        onError?.(err);
        return false;
      }
    },
    [duration, onSuccess, onError]
  );

  // Allow consumer to manually reset (e.g. unmount)
  const reset = useCallback(() => {
    setCopied(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { copied, copy, reset, setCopied };
}
