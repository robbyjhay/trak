"use client";

import { useState, type InputHTMLAttributes } from "react";
import { PATHS } from "@/components/icons";

export function PasswordInput({
  className,
  type: _type,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={className}
        style={{ paddingRight: "2.75rem" }}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center text-foreground-faint transition-colors hover:text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d={visible ? PATHS.eye : PATHS.eyeOff} />
        </svg>
      </button>
    </div>
  );
}