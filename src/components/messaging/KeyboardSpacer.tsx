"use client";

import { useEffect, useState } from "react";

export function KeyboardSpacer() {
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    if (!window.visualViewport) return;

    const update = () => {
      // Calculate how much the visual viewport has shrunk relative to innerHeight.
      // On iOS in resizes-visual mode, innerHeight stays stable while visualViewport.height shrinks.
      const diff = Math.max(0, window.innerHeight - window.visualViewport!.height);
      setKbHeight(diff);
      
      // We can also toggle a class for safe-area handling on the body.
      if (diff > 50) {
        document.documentElement.classList.add("keyboard-open");
      } else {
        document.documentElement.classList.remove("keyboard-open");
      }
    };

    update();
    window.visualViewport.addEventListener("resize", update);
    window.visualViewport.addEventListener("scroll", update);
    
    return () => {
      window.visualViewport!.removeEventListener("resize", update);
      window.visualViewport!.removeEventListener("scroll", update);
    };
  }, []);

  if (kbHeight === 0) return null;

  return <div style={{ height: kbHeight, flexShrink: 0 }} aria-hidden="true" />;
}
