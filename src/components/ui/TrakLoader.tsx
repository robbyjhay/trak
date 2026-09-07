import Image from "next/image";

interface TrakLoaderProps {
  className?: string; // e.g., 'w-16 h-16' for full page, 'w-6 h-6' for inline
}

export function TrakLoader({ className = "w-16 h-16" }: TrakLoaderProps) {
  return (
    <div className={`relative ${className}`} aria-label="Loading" role="status">
      <div className="absolute inset-0">
        <Image
          src="/logo-black.png"
          alt=""
          width={64}
          height={64}
          priority
          className="h-full w-full object-contain opacity-20 dark:hidden"
        />
        <Image
          src="/logo-white.png"
          alt=""
          width={64}
          height={64}
          priority
          className="hidden h-full w-full object-contain opacity-20 dark:block"
        />
      </div>
      <div className="absolute inset-0">
        <svg viewBox="0 0 500 500" className="h-full w-full">
          <defs>
            <mask id="trak-logo-mask">
              <image href="/logo-white.png" width="500" height="500" />
            </mask>
          </defs>
          <path
            mask="url(#trak-logo-mask)"
            pathLength="100"
            d="M 230 75 L 92 75 A 50 50 0 0 0 42 125 A 50 50 0 0 0 92 175 L 197 175 L 270 75 L 404 75 A 50 50 0 0 1 454 125 A 50 50 0 0 1 404 175 L 298 175 L 298 389 A 50 50 0 0 1 247 439 A 50 50 0 0 1 197 389 L 197 210"
            className="stroke-[var(--color-aztec)] dark:stroke-[var(--color-saffron)] motion-reduce:hidden"
            fill="none"
            strokeWidth="35"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: "15 85",
              animation: "trak-pulse 2s linear infinite",
            }}
          />
        </svg>
      </div>
      <style>{`
        @keyframes trak-pulse {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: -100;
          }
        }
      `}</style>
    </div>
  );
}
