"use client";

import { motion, useReducedMotion } from "framer-motion";
import { UserAvatar } from "@/components/ui/UserAvatar";

type CallAvatarProps = {
  photoUrl?: string | null;
  name: string;
  color?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  // visual state
  ringing?: boolean;
  connected?: boolean;
  muted?: boolean;
};

const sizeMap = {
  sm: "h-10 w-10 text-sm",
  md: "h-[72px] w-[72px] text-xl",
  lg: "h-[108px] w-[108px] text-[28px] md:h-[128px] md:w-[128px] md:text-[30px]",
  xl: "h-[112px] w-[112px] text-[30px] md:h-[148px] md:w-[148px] md:text-[36px]",
};

export function CallAvatar({
  photoUrl,
  name,
  color,
  size = "lg",
  ringing = false,
  connected = false,
  muted = false,
}: CallAvatarProps) {
  const shouldReduce = useReducedMotion();

  return (
    <div className="relative flex items-center justify-center">
      {/* Ringing: concentric pulse rings */}
      {ringing && !shouldReduce && (
        <>
          <motion.span
            aria-hidden
            className="absolute rounded-full bg-saffron/25"
            style={{ inset: -10 }}
            initial={{ scale: 0.92, opacity: 0.55 }}
            animate={{ scale: 1.18, opacity: 0 }}
            transition={{ duration: 1.9, repeat: Infinity, ease: "easeOut", delay: 0 }}
          />
          <motion.span
            aria-hidden
            className="absolute rounded-full bg-saffron/20"
            style={{ inset: -22 }}
            initial={{ scale: 0.88, opacity: 0.45 }}
            animate={{ scale: 1.22, opacity: 0 }}
            transition={{ duration: 1.9, repeat: Infinity, ease: "easeOut", delay: 0.45 }}
          />
          <motion.span
            aria-hidden
            className="absolute rounded-full border border-saffron/20"
            style={{ inset: -34 }}
            initial={{ scale: 0.9, opacity: 0.5 }}
            animate={{ scale: 1.15, opacity: 0 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: 0.9 }}
          />
        </>
      )}
      {/* Reduced motion fallback: static rings */}
      {ringing && shouldReduce && (
        <>
          <span aria-hidden className="absolute -inset-3 rounded-full border border-saffron/20" />
          <span aria-hidden className="absolute -inset-6 rounded-full border border-saffron/10" />
        </>
      )}

      {/* Connected: subtle breathing glow */}
      {connected && !ringing && !shouldReduce && (
        <motion.span
          aria-hidden
          className="absolute rounded-full bg-emerald-400/10 blur-xl"
          style={{ inset: -16 }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Avatar core */}
      <motion.div
        layoutId="call-avatar-core"
        className="relative"
        animate={
          shouldReduce
            ? undefined
            : ringing
              ? { scale: [1, 1.02, 1] }
              : connected
                ? { scale: [1, 1.01, 1] }
                : undefined
        }
        transition={
          ringing
            ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
            : connected
              ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
              : undefined
        }
      >
        {/* soft outer rim + shadow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18), transparent 55%)`,
            boxShadow: "0 18px 40px rgba(0,0,0,0.28), 0 2px 10px rgba(0,0,0,0.16)",
          }}
          aria-hidden
        />
        <UserAvatar
          photoUrl={photoUrl}
          name={name}
          color={color}
          className={`relative flex items-center justify-center rounded-full font-display font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_3px_rgba(0,0,0,0.14)] ring-1 ring-white/12 ${sizeMap[size]}`}
          imgClassName="h-full w-full rounded-full object-cover"
        />
        {/* bottom status dot */}
        {(ringing || connected) && (
          <span
            aria-hidden
            className={`absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-[#100e0b] shadow-md md:h-8 md:w-8 ${
              muted ? "bg-amber-400" : ringing ? "bg-saffron" : "bg-emerald-500"
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full bg-white ${ringing && !shouldReduce ? "animate-pulse" : ""}`} />
          </span>
        )}
      </motion.div>
    </div>
  );
}
