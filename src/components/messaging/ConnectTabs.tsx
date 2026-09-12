"use client";

import { cn } from "@/lib/utils";
import { useConnectNav } from "@/context/ConnectNav";
import { useTrak } from "@/context/TrakStore";
import { countUnreadMessages } from "@/lib/unreadMessages";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const TABS: Array<["messages" | "contacts", string]> = [
  ["messages", "Messages"],
  ["contacts", "Contacts"],
];

export function ConnectTabs({ className }: { className?: string }) {
  const { view, setView } = useConnectNav();
  const { myNotifications } = useTrak();
  const reduceMotion = useReducedMotion();
  const activeIndex = view === "messages" ? 0 : 1;
  const unread = countUnreadMessages(myNotifications());

  return (
    <div
      className={cn(
        "flex w-fit gap-1.5 rounded-[11px] bg-surface-muted p-1 relative",
        className,
      )}
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={view}
          layout={reduceMotion ? false : true}
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute inset-1 rounded-lg bg-surface-elevated shadow-sm z-0"
        />
      </AnimatePresence>
      {TABS.map(([key, label], index) => (
        <motion.button
          key={key}
          type="button"
          onClick={() => setView(key)}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          className={cn(
            "relative z-10 cursor-pointer rounded-lg border-none px-4 py-2 text-[12.5px] font-bold transition-colors",
            view === key ? "text-foreground" : "text-foreground-secondary hover:text-foreground",
          )}
        >
          {label}
          {key === "messages" && unread > 0 && (
            <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-success px-1 text-[10px] font-extrabold text-success-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </motion.button>
      ))}
    </div>
  );
}
