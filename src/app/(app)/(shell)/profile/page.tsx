"use client";

import { useTrak } from "@/context/TrakStore";
import { roleLabel } from "@/lib/permissions";
import { fmtDate } from "@/lib/dates";
import { initials } from "@/lib/utils";
import { PATHS } from "@/components/icons";
import { GhostBtn, PrimaryBtn } from "@/components/ui/Buttons";
import { ModalBackdrop, ModalPanel } from "@/components/ui/Modal";
import { useSelfieCapture } from "@/hooks/useSelfieCapture";

export default function ProfilePage() {
  const {
    sessionUser,
    dismissedPhotoNudges,
    dismissPhotoNudge,
    dismissedNotifNudges,
    dismissNotifNudge,
    notificationsEnabled,
    setNotificationsEnabled,
    updateUserProfile,
    showToast,
  } = useTrak();
  const u = sessionUser;
  const showNudge = !u.photoUrl && !dismissedPhotoNudges.has(u.id);
  const notifSupported = typeof Notification !== "undefined";
  const showNotifNudge =
    notifSupported &&
    !notificationsEnabled &&
    Notification.permission !== "denied" &&
    !dismissedNotifNudges.has(u.id);

  const selfie = useSelfieCapture();

  return (
    <div>
      <div className="mb-[22px]">
        <div className="mb-2 text-[11.5px] font-bold tracking-[0.12em] text-saffron-dim uppercase">
          Welcome
        </div>
        <h1 className="m-0 mb-1.5 font-display text-[30px] font-semibold">
          My Profile
        </h1>
        <p className="m-0 text-[13.5px] text-ink-soft">
          Everything Trak and the Digital Learning Unit has on file for you.
        </p>
      </div>

      {showNudge && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[18px] border-none bg-linear-to-br from-aztec to-aztec-2 px-[26px] py-6 text-paper">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-saffron/18 text-saffron">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.camera} />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold">Add a profile photo</div>
              <div className="mt-0.5 text-[12.5px] text-paper/65">
                Take a quick selfie so your teammates recognise you across Trak.
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PrimaryBtn
              className="bg-saffron text-aztec shadow-none"
              onClick={() => selfie.openCapture()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.camera} />
              </svg>
              Take a selfie
            </PrimaryBtn>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full border-none bg-paper/14 text-base text-paper"
              onClick={() => dismissPhotoNudge(u.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {showNotifNudge && (
        <div className="mb-[22px] flex flex-wrap items-center justify-between gap-4 rounded-[18px] border-[1.5px] border-[#f0dba9] bg-[#fffaf0] px-[26px] py-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-aztec-2 text-saffron">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.bell} />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold">Activate mobile notifications</div>
              <div className="mt-0.5 text-[12.5px] text-ink-soft">
                Get a real popup on this device the moment a comment, message, or
                activity update lands.
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PrimaryBtn
              onClick={async () => {
                if (!notifSupported) return;
                try {
                  const perm = await Notification.requestPermission();
                  if (perm === "granted") {
                    setNotificationsEnabled(true);
                    showToast(
                      "Mobile notifications activated",
                      "You'll get a device popup when something needs your attention.",
                    );
                  }
                } catch {
                  /* ignore */
                }
              }}
            >
              Activate
            </PrimaryBtn>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full border-none bg-black/6 text-base text-ink-soft"
              onClick={() => dismissNotifNudge(u.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[18px] border border-line bg-card px-[26px] py-6 text-center shadow-card">
          <div
            className="mx-auto mb-5 flex h-[132px] w-[132px] items-center justify-center overflow-hidden rounded-full font-display text-[40px] font-bold text-white shadow-[0_14px_28px_-12px_rgba(13,29,26,0.45)]"
            style={{ background: u.color }}
          >
            {u.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(u.name)
            )}
          </div>
          <div className="font-display text-xl leading-tight font-semibold">{u.name}</div>
          <div className="mt-1 text-[13px] text-ink-soft">
            {u.designation || roleLabel(u)}
          </div>
          <GhostBtn
            className="mt-[18px] justify-center"
            onClick={() => selfie.openCapture()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={PATHS.camera} />
            </svg>
            {u.photoUrl ? "Retake photo" : "Take a selfie"}
          </GhostBtn>
        </div>

        <div className="rounded-[18px] border border-line bg-card px-[26px] py-6 shadow-card">
          <div className="mb-6 border-b border-line pb-4">
            <h2 className="m-0 font-display text-[17px] font-semibold">
              Personnel record
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-soft">
              {u.role === "head"
                ? "You manage this for the unit"
                : "Managed by the Head of Unit"}
            </p>
          </div>
          <dl>
            {(
              [
                ["Full name", u.name],
                ["Designation", u.designation || "—"],
                ["Role", roleLabel(u)],
                ["Grade level", u.gradeLevel || "—"],
                ["Sex", u.sex || "—"],
                ["Phone", u.phone || "—"],
                ["State of origin", u.stateOfOrigin || "—"],
                ["Date joined PSSDC", u.dateJoined ? fmtDate(u.dateJoined) : "—"],
                ["Username", u.username],
              ] as const
            ).map(([k, v]) => (
              <div
                key={k}
                className="grid grid-cols-1 items-baseline gap-x-6 border-b border-line/60 py-2.5 first:pt-0 last:border-none last:pb-0 sm:grid-cols-[160px_1fr]"
              >
                <dt className="text-[12.5px] text-ink-soft">{k}</dt>
                <dd
                  className={`text-[13px] font-bold text-ink ${k === "Username" ? "font-mono" : ""}`}
                >
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 rounded-[10px] border border-line bg-neutral-bg p-3 text-[12px] leading-relaxed text-ink-soft">
            {u.role !== "head" ? (
              <>
                Spot something out of date? Message the Head of Unit via{" "}
                <b className="text-ink">Connect</b> — these details are kept up
                to date from the Accounting Officer dashboard.
              </>
            ) : (
              <>
                Edit anyone&apos;s record — including your own — from{" "}
                <b className="text-ink">Team profiles</b> on your Accounting
                Officer dashboard.
              </>
            )}
          </div>
        </div>
      </div>

      <ModalBackdrop open={selfie.open} onClose={selfie.close}>
        <ModalPanel className="w-[420px]">
          <h3 className="m-0 mb-1.5 font-display text-xl">Take a selfie</h3>
          <p className="mb-5 text-[12.5px] text-ink-soft">
            Only a live photo from your camera is accepted — you can&apos;t
            upload one from your gallery.
          </p>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#111]">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={selfie.videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover ${selfie.previewUrl ? "hidden" : "block"} scale-x-[-1]`}
            />
            {selfie.previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selfie.previewUrl}
                alt="Preview"
                className="h-full w-full object-cover"
              />
            )}
            <canvas ref={selfie.canvasRef} className="hidden" />
          </div>
          {selfie.error && (
            <div className="mt-3.5 text-[12.5px] leading-snug text-critical">
              {selfie.error}
            </div>
          )}
          {selfie.hint && (
            <div className="mt-2 text-[11.5px] leading-snug text-ink-faint">
              {selfie.hint}
            </div>
          )}
          <div className="mt-[22px] flex gap-2.5">
            {selfie.previewUrl ? (
              <>
                <button
                  type="button"
                  className="flex-1 cursor-pointer rounded-[10px] border-[1.5px] border-line py-3 font-bold"
                  onClick={selfie.retake}
                >
                  Retake
                </button>
                <button
                  type="button"
                  className="flex-[1.3] cursor-pointer rounded-[10px] border-none bg-aztec py-3 font-bold text-white"
                  onClick={() => {
                    if (selfie.previewUrl) {
                      void updateUserProfile(u.id, {
                        photoUrl: selfie.previewUrl,
                      })
                        .then(() => {
                          selfie.close();
                          showToast("Profile photo saved", "Looking good!");
                        })
                        .catch(() =>
                          showToast(
                            "Could not save photo",
                            "Please try again.",
                          ),
                        );
                    }
                  }}
                >
                  Use this photo
                </button>
              </>
            ) : selfie.error ? (
              <>
                <button
                  type="button"
                  className="flex-1 cursor-pointer rounded-[10px] border-[1.5px] border-line py-3 font-bold"
                  onClick={selfie.close}
                >
                  Cancel
                </button>
                {selfie.offerNewTab && (
                  <button
                    type="button"
                    className="flex-1 cursor-pointer rounded-[10px] border-[1.5px] border-line py-3 font-bold"
                    onClick={() => window.open(window.location.href, "_blank")}
                  >
                    Open in new tab
                  </button>
                )}
                <button
                  type="button"
                  className="flex-[1.3] cursor-pointer rounded-[10px] border-none bg-aztec py-3 font-bold text-white"
                  onClick={() => selfie.openCapture()}
                >
                  Try again
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="flex-1 cursor-pointer rounded-[10px] border-[1.5px] border-line py-3 font-bold"
                  onClick={selfie.close}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-[1.3] cursor-pointer rounded-[10px] border-none bg-aztec py-3 font-bold text-white"
                  onClick={selfie.shoot}
                >
                  Capture
                </button>
              </>
            )}
          </div>
        </ModalPanel>
      </ModalBackdrop>
    </div>
  );
}
