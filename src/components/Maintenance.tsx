import Image from "next/image";

export function Maintenance() {
  return (
    <>
      <style>{`
        body { background-color: #100e0b !important; }
        .aura-layer-2 { filter: blur(175px); }
        .aura-layer-3 { filter: blur(125px); }
        @media (min-width: 768px) {
          .aura-layer-2 { filter: blur(252px); }
          .aura-layer-3 { filter: blur(180px); }
        }
      `}</style>
      <main className="dark relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6 py-16">
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(45deg, transparent 0, transparent 24px, rgba(167,139,250,0.10) 25px, transparent 26px), repeating-linear-gradient(-45deg, transparent 0, transparent 24px, rgba(167,139,250,0.10) 25px, transparent 26px)",
            mixBlendMode: "normal",
            opacity: 0.85,
            pointerEvents: "none",
            transform: "translateZ(0)",
          }}
          aria-hidden="true"
        />
        <div
          className="aura-layer-2"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 55% 55% at 48% 45%, rgba(139,92,246,0.34) 0%, rgba(91,33,182,0.10) 50%, transparent 78%)",
            mixBlendMode: "screen",
            pointerEvents: "none",
            transform: "translateZ(0)",
          }}
          aria-hidden="true"
        />
        <div
          className="aura-layer-3"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 78% 22%, rgba(236,72,153,0.20) 0%, transparent 35%)",
            mixBlendMode: "screen",
            pointerEvents: "none",
            transform: "translateZ(0)",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-7 text-center">
          <Image
            src="/logo-white.png"
            alt="Trak"
            width={96}
            height={96}
            priority
            className="h-20 w-20 object-contain"
          />

          <div className="flex flex-col items-center gap-4">
            <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-foreground-secondary">
              Under maintenance
            </span>
            <h1 className="font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              TRAK is currently undergoing an update.
            </h1>
          </div>

          <p className="max-w-md text-base leading-relaxed text-foreground-secondary">
            We&apos;re sorry for the inconvenience. We&apos;re currently working on
            an important update to improve the application and resolve some
            issues.
          </p>

          <div className="h-px w-24 bg-primary" />

          <p className="text-sm text-foreground-muted">
            We&apos;ll be back shortly. Thank you for your patience and
            understanding.
          </p>
        </div>
      </main>
    </>
  );
}