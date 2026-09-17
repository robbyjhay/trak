"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const DESKTOP_STEPS = [
  { id: "dashboard", title: "Dashboard", text: "Your daily overview and high-level metrics." },
  { id: "new-activity", title: "Create Activity", text: "Log a new task or update your progress here." },
  { id: "activities", title: "Activities", text: "Track and manage your ongoing work and tasks." },
  { id: "responsibilities", title: "Responsibilities", text: "View and manage your core responsibilities." },
  { id: "messages", title: "Connect", text: "Message your team and stay in touch." },
  { id: "library", title: "Library", text: "Access important documents and resources." },
  { id: "innovation", title: "Innovation Cloud", text: "Share and explore innovative ideas." },
  { id: "more", title: "Settings", text: "Manage your app preferences and settings." },
  { id: "notifications", title: "Notifications", text: "Alerts for mentions, reminders, and updates." },
  { id: "profile", title: "Profile", text: "This is where you manage your settings and your profile information." },
];

const MOBILE_STEPS = [
  { id: "notifications", title: "Notifications", text: "Alerts for mentions, reminders, and updates." },
  { id: "profile", title: "Profile", text: "This is where you manage your settings and your profile information." },
  { id: "dashboard", title: "Dashboard", text: "Your daily overview and high-level metrics." },
  { id: "activities", title: "Activities", text: "Track and manage your ongoing work and tasks." },
  { id: "new-activity", title: "Create Activity", text: "Log a new task or update your progress here." },
  { id: "messages", title: "Connect", text: "Message your team and stay in touch." },
  { id: "more", title: "More options", text: "Access settings, library, innovation cloud, and your responsibilities." },
];

export function GuidedTour() {
  const [mounted, setMounted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    setMounted(true);
    const hasSeen = localStorage.getItem("trak_tour_seen");
    // const hasSeen = false; // [TESTING MODE] Force tour to show on every reload
    if (!hasSeen) {
      const t = setTimeout(() => setIsActive(true), 1000);
      return () => clearTimeout(t);
    }
  }, []);

  const isMobile = mounted ? window.innerWidth < 768 : false;
  const activeSteps = isMobile ? MOBILE_STEPS : DESKTOP_STEPS;

  useEffect(() => {
    if (!isActive) return;

    const updateRect = () => {
      const step = activeSteps[stepIndex];
      if (!step) return;
      const els = Array.from(document.querySelectorAll(`[data-tour="${step.id}"]`));
      const el = els.find((e) => {
        const rect = e.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [isActive, stepIndex, activeSteps]);

  if (!mounted || !isActive) return null;

  const handleNext = () => {
    if (stepIndex < activeSteps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleSkip();
    }
  };

  const handleSkip = () => {
    setIsActive(false);
    localStorage.setItem("trak_tour_seen", "true");
  };

  const step = activeSteps[stepIndex];
  if (!step) return null;
  
  let tooltipStyle: React.CSSProperties = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  let highlightStyle: React.CSSProperties = { display: "none" };

  if (targetRect) {
    const isProfileDesktop = step.id === "profile" && !isMobile;
    
    // For profile on desktop, use the full target width/height (rectangular focus)
    // Otherwise, use a circular focus based on the largest dimension
    const pad = 8;
    const radius = Math.max(targetRect.width, targetRect.height) / 2 + pad;
    
    const cw = isProfileDesktop ? targetRect.width + pad * 2 : radius * 2;
    const ch = isProfileDesktop ? targetRect.height + pad * 2 : radius * 2;
    const cx = isProfileDesktop ? targetRect.left - pad : targetRect.left + targetRect.width / 2 - radius;
    const cy = isProfileDesktop ? targetRect.top - pad : targetRect.top + targetRect.height / 2 - radius;
    const rx = isProfileDesktop ? 16 : radius; // 16px corner radius for the profile rectangle
    
    const svgMask = `
      <svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%'>
        <defs>
          <mask id='m'>
            <rect width='100%' height='100%' fill='white'/>
            <rect x='${cx}' y='${cy}' width='${cw}' height='${ch}' rx='${rx}' fill='black'/>
          </mask>
        </defs>
        <rect width='100%' height='100%' fill='black' mask='url(#m)'/>
      </svg>
    `.trim().replace(/\s+/g, ' ');
    const encodedMask = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMask)}")`;

    highlightStyle = {
      display: "block",
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      backdropFilter: "blur(2px)",
      WebkitBackdropFilter: "blur(2px)",
      maskImage: encodedMask,
      WebkitMaskImage: encodedMask,
      pointerEvents: "none",
      zIndex: 9999,
    };

    // const isMobile = window.innerWidth < 768; // Removed redeclaration
    if (isMobile) {
      if (targetRect.top < 100) {
        tooltipStyle = {
          top: targetRect.bottom + 16,
          left: "50%",
          transform: "translateX(-50%)",
        };
      } else {
        tooltipStyle = {
          bottom: window.innerHeight - targetRect.top + 16,
          left: "50%",
          transform: "translateX(-50%)",
        };
      }
    } else {
      if (targetRect.top < 100 && targetRect.right > window.innerWidth - 200) {
        // Desktop Topbar right (Profile)
        tooltipStyle = {
          top: targetRect.bottom + 16,
          right: window.innerWidth - targetRect.right,
        };
      } else if (targetRect.bottom + 200 > window.innerHeight) {
        // Desktop near bottom (Settings)
        tooltipStyle = {
          bottom: window.innerHeight - targetRect.top + 20,
          left: targetRect.right + 20,
        };
      } else {
        tooltipStyle = {
          top: Math.max(20, targetRect.top - 20),
          left: targetRect.right + 20,
        };
      }
    }
  } else {
    highlightStyle = {
      display: "block",
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.3)",
      backdropFilter: "blur(2px)",
      WebkitBackdropFilter: "blur(2px)",
      zIndex: 9999,
    };
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-auto">
      <div style={highlightStyle} />
      <div
        className="absolute z-[10000] w-[280px] sm:w-[320px] rounded-[16px] bg-surface-elevated p-5 shadow-modal text-foreground border border-border"
        style={{ ...tooltipStyle, transition: "all 0.15s ease-out" }}
      >
        <div className="mb-1 text-[11px] font-bold text-primary uppercase tracking-wider">
          Step {stepIndex + 1} of {activeSteps.length}
        </div>
        <h3 className="mb-2 text-[16px] font-display font-bold">{step.title}</h3>
        <p className="mb-5 text-[13px] text-foreground-secondary leading-relaxed">
          {step.text}
        </p>
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-[13px] font-semibold text-foreground-faint hover:text-foreground transition-colors cursor-pointer"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="rounded-[8px] bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground hover:bg-primary-hover transition-colors cursor-pointer"
          >
            {stepIndex === activeSteps.length - 1 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
