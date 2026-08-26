"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { PATHS } from "@/components/icons";
import { SettingsNav } from "./SettingsNav";

export function SettingsLayoutShell({
  role,
  children,
}: {
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // On mobile, if we are exactly on /settings, we show the nav and hide content.
  // If we are on /settings/something, we hide nav and show content.
  const isHome = pathname === "/settings";

  return (
    <div>
      <div className="mb-2 hidden md:block text-[11.5px] font-bold tracking-[0.12em] text-saffron-dim uppercase">
        Trak
      </div>
      
      {/* Mobile Back Button (only when not on home) */}
      {!isHome && (
        <div className="md:hidden mb-4">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-[14px] font-semibold text-primary transition-colors hover:text-primary-hover"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d={PATHS.chevronLeft} />
            </svg>
            Settings
          </Link>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Nav: hidden on mobile if not home */}
        <div className={`w-full md:w-64 shrink-0 md:sticky md:top-[112px] md:self-start md:max-h-[calc(100vh-120px)] overflow-y-auto ${!isHome ? 'hidden md:block' : 'block'}`} style={{ scrollbarWidth: "none" }}>
          <SettingsNav role={role} />
        </div>
        
        {/* Content: hidden on mobile if home */}
        <div className={`flex-1 min-w-0 ${isHome ? 'hidden md:block' : 'block'}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
