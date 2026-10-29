import Image from "next/image";
import type { ReactNode } from "react";
import { CopyIconButton } from "@/components/ui/CopyButton";
import { PATHS } from "@/components/icons";
import { NEW_TRAK_LOGIN_URL, NEW_TRAK_URL } from "@/lib/migration";

const NEW_HOST_DISPLAY = NEW_TRAK_URL.replace("https://", "");
const NEW_PATH_DISPLAY = NEW_TRAK_LOGIN_URL.replace(NEW_TRAK_URL, "");

const panelNotes: { icon: string; title: string; body: ReactNode; hideOnMobile?: boolean }[] = [
  {
    icon: PATHS.user,
    title: "Your account",
    body: (
      <>
        Sign in on the new site with the{" "}
        <span className="font-semibold text-foreground">
          same TRAK username and password
        </span>{" "}
        you already use — there&apos;s no new account to create. If a password
        isn&apos;t accepted, use{" "}
        <span className="font-semibold text-foreground">Forgot password</span>{" "}
        on the new sign-in page to reset it.
      </>
    ),
  },
  {
    icon: PATHS.download,
    title: "Installed the app?",
    body: (
      <>
        Remove the old home-screen install and add it again from the new
        address. The version installed from this domain keeps opening the
        retired site.
      </>
    ),
  },
  {
    icon: PATHS.pin,
    title: "This address",
    body: (
      <>
        This old domain now serves this notice only. Bookmark the new address
        above — activities, messaging, attendance and reports have all moved
        with it.
      </>
    ),
    hideOnMobile: true,
  },
];

export function Migration() {
  return (
    <>
      <style>{`
        body { background-color: #100e0b !important; }
        .aura-layer-2 { filter: blur(175px); opacity: 0.75; }
        .aura-layer-3 { filter: blur(125px); opacity: 0.75; }
        @media (min-width: 768px) {
          .aura-layer-2 { filter: blur(252px); }
          .aura-layer-3 { filter: blur(180px); }
        }
        @media (max-width: 767px) {
          html, body {
            overflow: hidden;
            height: 100%;
            overscroll-behavior: none;
          }
          .migration-cta { color: #ffffff; }
        }
        @media (max-width: 767px) and (max-height: 739px) {
          .migration-intro { display: none; }
        }
        @media (max-width: 767px) and (max-height: 620px) {
          .migration-frame { transform: scale(0.88); transform-origin: center; }
        }
      `}</style>
      <main
        id="main"
        className="migration-page dark relative flex h-[100dvh] items-center overflow-hidden overscroll-none px-5 py-5 sm:px-8 md:h-auto md:min-h-[100dvh] md:overflow-visible md:py-16 lg:px-10"
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(45deg, transparent 0, transparent 24px, rgba(167,139,250,0.10) 25px, transparent 26px), repeating-linear-gradient(-45deg, transparent 0, transparent 24px, rgba(167,139,250,0.10) 25px, transparent 26px)",
            mixBlendMode: "normal",
            opacity: 0.75,
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
              "radial-gradient(ellipse 55% 55% at 34% 45%, rgba(139,92,246,0.34) 0%, rgba(91,33,182,0.10) 50%, transparent 78%)",
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
              "radial-gradient(circle at 82% 24%, rgba(236,72,153,0.22) 0%, transparent 38%)",
            mixBlendMode: "screen",
            pointerEvents: "none",
            transform: "translateZ(0)",
          }}
          aria-hidden="true"
        />

          <div className="migration-frame relative z-10 mx-auto grid w-full max-w-5xl gap-5 md:gap-9 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:gap-12">
          <section className="flex min-w-0 flex-col items-start gap-2.5 text-left md:gap-5">
            <div className="flex items-center gap-2.5 md:gap-3.5">
              <Image
                src="/logo-white.png"
                alt="Trak"
                width={88}
                height={88}
                priority
                className="h-9 w-9 object-contain md:h-12 md:w-12"
              />
              <div className="text-[10px] leading-snug uppercase tracking-[0.08em] text-foreground-muted sm:text-[11.5px] sm:tracking-[0.16em]">
                Lagos State Government · PSSDC
                <b className="block font-bold text-foreground-secondary">
                  Digital Learning Unit
                </b>
              </div>
            </div>

            <span className="rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-foreground-secondary md:px-3 md:py-1 md:text-[11px]">
              Trak has moved
            </span>

            <h1 className="font-display text-[26px] font-semibold leading-[1.07] text-foreground sm:text-[clamp(30px,5vw,50px)]">
              TRAK now lives at a new web address.
            </h1>

            <p className="migration-intro max-w-[54ch] text-[13.5px] leading-snug text-foreground-secondary sm:text-[15.5px] sm:leading-relaxed">
              The Digital Learning Unit&apos;s activity &amp; operations
              register has moved — this old domain is being retired.
              <span className="hidden sm:inline">
                {" "}
                Everything you do in TRAK — activities, messaging, attendance
                and reports — now runs at the new address below.
              </span>
            </p>

            <div className="hidden flex-wrap items-center gap-2.5 font-mono text-[12px] sm:flex">
              <span className="rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-foreground-faint line-through decoration-foreground-faint/70">
                this domain
              </span>
              <span className="text-foreground-faint" aria-hidden="true">
                →
              </span>
              <span className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-foreground">
                {NEW_HOST_DISPLAY}
              </span>
            </div>

            <p className="hidden text-xs text-foreground-muted md:block">
              Existing members sign in with their usual TRAK credentials — no
              re-registration needed.
            </p>
          </section>

          <aside className="flex w-full min-w-0 flex-col gap-3 rounded-3xl border border-border bg-surface-muted/75 p-4 shadow-[0_28px_70px_-34px_rgba(0,0,0,0.85)] backdrop-blur-sm sm:p-5 md:gap-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-foreground-secondary md:text-[11px]">
                New sign-in address
              </span>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary md:text-[10.5px]">
                Moved
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 px-3.5 py-2.5 md:px-4 md:py-3">
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-foreground-faint md:text-[10.5px]">
                  Go to
                </div>
                <a
                  href={NEW_TRAK_LOGIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block break-words font-mono text-[12.5px] leading-snug text-foreground transition-colors hover:text-primary md:text-[13.5px]"
                >
                  {NEW_HOST_DISPLAY}
                  <wbr />
                  {NEW_PATH_DISPLAY}
                </a>
              </div>
              <CopyIconButton text={NEW_TRAK_LOGIN_URL} label="Copy link" />
            </div>

            <a
              href={NEW_TRAK_LOGIN_URL}
              className="migration-cta flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[14px] font-bold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:py-3.5 md:text-[14.5px]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d={PATHS.login} />
              </svg>
              Go to the New TRAK
            </a>

            <div className="flex flex-col gap-3 md:gap-4">
              {panelNotes.map((note, i) => (
                <div
                  key={note.title}
                  className={[
                    i === 0 ? "" : "border-t border-border/80 pt-3 md:pt-4",
                    note.hideOnMobile ? "migration-note-optional hidden md:block" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-2.5 md:gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-border bg-background/50 text-foreground-secondary md:h-7 md:w-7">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="h-3.5 w-3.5 md:h-4 md:w-4"
                      >
                        <path d={note.icon} />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-widest text-foreground-secondary md:text-[11.5px]">
                        {note.title}
                      </div>
                      <p className="mt-1 text-[12.5px] leading-snug text-foreground-muted md:text-[13.5px] md:leading-relaxed">
                        {note.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="migration-footer hidden border-t border-border/80 pt-4 text-xs text-foreground-muted md:block">
              Questions? Contact your Digital Learning Unit administrator.
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}
