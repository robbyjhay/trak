"use client";

/**
 * Microdots — Aura Gradient background (lattice, dark)
 *
 * Spec compliance:
 * - Base color #100e0b lives on the *page wrapper* (the fixed overlay), NOT on the aura container.
 * - Aura container itself is transparent; layers use mix-blend-mode against the wrapper.
 * - 3 layers: dot grid (normal) + two radials (screen, blurred), pointer-events none.
 */
export function ChromeInfernoAura() {
  return (
    <>
      {/* Layer 1 — microdots grid, normal, no blur */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle, rgba(147,197,253,0.16) 1px, transparent 1.5px)",
          backgroundSize: "14px 14px",
          mixBlendMode: "normal",
          pointerEvents: "none",
          transform: "translateZ(0)",
          willChange: "transform",
        }}
      />
      {/* Layer 2 — ellipse at 50% 45%, screen, blurred 163/234 */}
      <div
        aria-hidden="true"
        className="aura-layer-micro-2"
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 65% 50% at 50% 45%, rgba(59,130,246,0.26) 0%, transparent 75%)",
          mixBlendMode: "screen",
          pointerEvents: "none",
          transform: "translateZ(0)",
          willChange: "transform",
        }}
      />
      {/* Layer 3 — circle at 80% 25%, screen, blurred 113/162 */}
      <div
        aria-hidden="true"
        className="aura-layer-micro-3"
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 80% 25%, rgba(125,211,252,0.22) 0%, transparent 30%)",
          mixBlendMode: "screen",
          pointerEvents: "none",
          transform: "translateZ(0)",
          willChange: "transform",
        }}
      />
      <style>{`
        .aura-layer-micro-2 { filter: blur(163px); }
        .aura-layer-micro-3 { filter: blur(113px); }
        @media (min-width: 768px) {
          .aura-layer-micro-2 { filter: blur(234px) !important; }
          .aura-layer-micro-3 { filter: blur(162px) !important; }
        }
      `}</style>
    </>
  );
}

/** Alias for the Microdots spec — same implementation */
export const MicrodotsAura = ChromeInfernoAura;
export const BlueprintAura = ChromeInfernoAura;
export const AuraBackground = ChromeInfernoAura;
