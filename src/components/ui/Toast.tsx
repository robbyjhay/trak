"use client";

import { useEffect, useState, useRef } from "react";
import { useTrak } from "@/context/TrakStore";
import { PATHS } from "@/components/icons";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export function Toast() {
  const { toast } = useTrak();
  const shouldReduceMotion = useReducedMotion();
  const [internalToast, setInternalToast] = useState<{title: string, desc: string, id: number} | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const idCounter = useRef(0);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (toast.show) {
      idCounter.current += 1;
      setInternalToast({ title: toast.title, desc: toast.desc, id: idCounter.current });
      setIsVisible(true);
      
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        setIsVisible(false);
      }, 2500);
    } else {
      setIsVisible(false);
    }
  }, [toast]);

  function handleDismiss() {
    setIsVisible(false);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }

  return (
    <div className="fixed top-[max(env(safe-area-inset-top,0px),16px)] right-[max(env(safe-area-inset-right,0px),16px)] z-[200] flex flex-col items-end gap-2 w-[calc(100vw-32px)] sm:w-[380px] pointer-events-none">
      <AnimatePresence mode="wait">
        {isVisible && internalToast && (
          <motion.div
            key={internalToast.id}
            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 50, y: shouldReduceMotion ? 0 : -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: shouldReduceMotion ? 0 : 50, transition: { ease: "easeIn", duration: 0.2 } }}
            transition={{ ease: "easeOut", duration: 0.3 }}
            className="pointer-events-auto flex w-full items-start gap-3 rounded-[14px] bg-tooltip px-5 py-4 text-white shadow-toast"
            role="status"
            aria-live="polite"
          >
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground mt-0.5">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d={PATHS.check} />
              </svg>
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <div className="text-[13.5px] font-bold truncate">{internalToast.title}</div>
              <div className="text-xs leading-snug text-white/70 mt-0.5 break-words overflow-wrap-anywhere">{internalToast.desc}</div>
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 text-white/50 hover:text-white transition-colors p-1 -mr-2 -mt-1 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Dismiss notification"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
