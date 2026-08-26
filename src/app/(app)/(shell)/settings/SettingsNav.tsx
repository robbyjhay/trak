"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SettingsNav({ role }: { role: string }) {
  const pathname = usePathname();

  const groups = [
    {
      title: "General",
      links: [
        { href: "/settings/appearance", label: "Appearance" },
      ],
    },
    {
      title: "Security",
      links: [
        { href: "/settings/security", label: "Change Password & Sessions" },
      ],
    },
    {
      title: "Notifications",
      links: [
        { href: "/settings/notifications", label: "Notification Preferences" },
      ],
    },
  ];

  if (role === "head") {
    groups.push({
      title: "Unit Administration",
      links: [
        { href: "/settings/unit/onboarding", label: "Default Member Password" },
        { href: "/settings/unit/audit", label: "Security & Audit Log" },
      ],
    });
  }

  return (
    <nav className="space-y-6">
      {groups.map((g) => (
        <div key={g.title}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {g.title}
          </h3>
          <div className="flex flex-col space-y-1">
            {g.links.map((l) => {
              const active = pathname === l.href || (pathname?.startsWith(l.href + "/") ?? false);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    active
                      ? "bg-secondary text-secondary-foreground font-medium"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
