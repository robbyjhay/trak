"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useTrak } from "@/context/TrakStore";
import { apiSend } from "@/lib/api/client";
import { roleLabel } from "@/lib/permissions";
import { fmtDate } from "@/lib/dates";
import { PATHS } from "@/components/icons";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Switch } from "@/components/ui/Switch";
import { InstallAppRow } from "@/components/pwa/InstallAppRow";
import {
  getPushUiState,
  requestPushPermissionAndSubscribe,
  unsubscribeFromPush,
} from "@/hooks/usePushNotifications";

/** Square-crop + downscale to a 480px JPEG blob (same output as before). */
async function fileToSquareJpegBlob(file: File): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not decode the image"));
    el.src = dataUrl;
  });

  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  const size = Math.min(width, height);
  if (!size) throw new Error("Empty image");

  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, (width - size) / 2, (height - size) / 2, size, size, 0, 0, 480, 480);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!blob) throw new Error("Could not encode image");
  return blob;
}

/** Upload via the existing avatar storage pipeline, returns the public URL. */
async function uploadAvatar(blob: Blob): Promise<string> {
  const signed = await apiSend<{
    key: string;
    uploadUrl: string;
    publicUrl: string;
    method: "PUT";
  }>("/api/uploads/sign", "POST", {
    purpose: "avatar",
    contentType: blob.type || "image/jpeg",
    filename: "avatar.jpg",
    size: blob.size,
  });
  const putRes = await fetch(signed.uploadUrl, {
    method: signed.method,
    headers: { "Content-Type": blob.type || "image/jpeg" },
    body: blob,
  });
  if (!putRes.ok) throw new Error("Upload failed");
  // Store root-relative for same-origin URLs so the avatar resolves on any
  // host (localhost, LAN IP, deployed domain) instead of baking in APP_URL.
  const origin = window.location.origin;
  return signed.publicUrl.startsWith(`${origin}/`)
    ? signed.publicUrl.slice(origin.length)
    : signed.publicUrl;
}

export default function ProfilePage() {
  const {
    sessionUser,
    setNotificationsEnabled,
    updateUserProfile,
    showToast,
  } = useTrak();
  const u = sessionUser;
  const showNudge = !u.photoUrl;

  // Real push state — the single source of truth for this control.
  // "checking" is the initial state so we never flash a wrong enable prompt.
  const [pushState, setPushState] = useState<
    "checking" | "enabled" | "disabled" | "denied" | "ios-install-required" | "unsupported"
  >("checking");
  const [pushBusy, setPushBusy] = useState(false);

  const refreshPushState = useCallback(async () => {
    try {
      const s = await getPushUiState();
      setPushState(s);
      // Keep the legacy store flag in sync for any other readers.
      setNotificationsEnabled(s === "enabled");
    } catch {
      setPushState("unsupported");
    }
  }, [setNotificationsEnabled]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (!alive) return;
      await refreshPushState();
    })();
    // Re-check when the tab regains focus so enabling/disabling elsewhere
    // (e.g. Settings) is reflected here without a full reload.
    const onFocus = () => {
      void refreshPushState();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshPushState]);

  // Show the row for every state except truly-unsupported browsers, where
  // push can never work and the row would only be noise.
  const showNotifRow = pushState !== "unsupported";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  
  const [editEmail, setEditEmail] = useState(u.email || "");
  const [editPhone, setEditPhone] = useState(u.phone || "");
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    setEditEmail(u.email || "");
    setEditPhone(u.phone || "");
  }, [u.email, u.phone]);

  const handleSaveContact = async () => {
    if (savingContact) return;
    setSavingContact(true);
    try {
      await updateUserProfile(u.id, { email: editEmail, phone: editPhone });
      showToast("Contact details saved", "Your profile has been updated.");
    } catch (e: any) {
      showToast("Could not save contact details", typeof e?.message === "string" ? e.message : "Please try again.");
    } finally {
      setSavingContact(false);
    }
  };

  const openPicker = () => {
    if (!photoBusy) fileInputRef.current?.click();
  };

  const handlePhotoPicked = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || photoBusy) return;
    setPhotoBusy(true);
    try {
      const blob = await fileToSquareJpegBlob(file);
      const photoUrl = await uploadAvatar(blob);
      await updateUserProfile(u.id, { photoUrl });
      showToast("Profile photo saved", "Looking good!");
    } catch {
      showToast("Could not save photo", "Please try again.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  };

  const handleNotifToggle = (checked: boolean) => {
    if (pushBusy || pushState === "checking") return;
    // Blocked / iOS-install states never offer the normal enable path.
    if (checked && (pushState === "denied" || pushState === "ios-install-required")) return;
    if (!checked && pushState !== "enabled") return;
    if (checked && pushState === "enabled") return;
    setPushBusy(true);
    void (async () => {
      try {
        if (checked) {
          await requestPushPermissionAndSubscribe();
          showToast(
            "Mobile notifications activated",
            "You'll get a device popup when something needs your attention.",
          );
        } else {
          await unsubscribeFromPush();
          showToast(
            "Mobile notifications off",
            "You can re-enable them here any time. Past notifications are kept.",
          );
        }
      } catch (e: any) {
        showToast(
          checked ? "Could not enable notifications" : "Could not disable notifications",
          typeof e?.message === "string" && e.message
            ? e.message
            : "Please try again.",
        );
      } finally {
        await refreshPushState();
        setPushBusy(false);
      }
    })();
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handlePhotoPicked(e)}
      />

      {showNudge && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Add a profile photo"
          onClick={openPicker}
          onKeyDown={handleCardKeyDown}
          className="mb-[22px] flex cursor-pointer flex-wrap items-center justify-between gap-4 rounded-[18px] border-none bg-linear-to-br from-aztec to-aztec-2 px-[26px] py-6 text-paper transition-transform hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-saffron/18 text-saffron">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={PATHS.camera} />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold">Add a profile photo</div>
              <div className="mt-0.5 text-[12.5px] text-paper/65">
                Use your camera, photo library, or files so teammates recognise you
                across Trak.
              </div>
            </div>
          </div>
          <svg
            className={`shrink-0 text-paper/70 transition-transform ${photoBusy ? "animate-pulse" : ""}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d={PATHS.chevronRight} />
          </svg>
        </div>
      )}

      {showNotifRow && (
        <div className="mb-[22px] flex items-center justify-between gap-3 rounded-[12px] border border-border bg-surface px-4 py-2 shadow-card">
          <div className="flex min-w-0 items-center gap-2.5">
            <svg
              className="shrink-0 text-primary"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d={PATHS.bell} />
            </svg>
            <span className="truncate text-[12.5px] font-bold text-foreground">
              Mobile notifications
            </span>
            <span className="hidden truncate text-[12px] text-foreground-secondary md:inline">
              Get device popups when something needs your attention.
            </span>
          </div>
          {pushState === "checking" ? (
            <span
              className="shrink-0 animate-pulse text-[12px] font-semibold text-foreground-secondary"
              role="status"
              aria-live="polite"
            >
              Checking…
            </span>
          ) : pushState === "denied" ? (
            <div className="flex shrink-0 flex-col items-end text-right">
              <span className="mb-1 inline-block rounded-md bg-red-500/10 px-3 py-1.5 text-[13px] font-bold text-red-600">
                Blocked
              </span>
              <p className="w-44 text-[10px] leading-tight text-muted-foreground">
                Notifications are blocked. Allow them in your browser or device
                settings to turn them on.
              </p>
            </div>
          ) : pushState === "ios-install-required" ? (
            <div className="flex shrink-0 flex-col items-end text-right">
              <span className="mb-1 inline-block rounded-md bg-surface-muted px-3 py-1.5 text-[13px] font-bold text-muted-foreground">
                Install App First
              </span>
              <p className="w-44 text-[10px] leading-tight text-muted-foreground">
                On iPhone/iPad, add TRAK to your Home Screen first, then enable
                notifications from the installed app.
              </p>
            </div>
          ) : (
            <Switch
              id="profile-notifications-toggle"
              checked={pushState === "enabled"}
              onChange={handleNotifToggle}
              disabled={pushBusy}
              aria-label="Mobile notifications"
              className="shrink-0"
            />
          )}
        </div>
      )}

      <InstallAppRow />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div
          role="button"
          tabIndex={0}
          aria-label="Add a profile photo"
          onClick={openPicker}
          onKeyDown={handleCardKeyDown}
          className="group cursor-pointer rounded-[18px] border border-border bg-surface px-[26px] py-6 text-center shadow-card transition-colors hover:border-primary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <UserAvatar
            photoUrl={u.photoUrl}
            name={u.name}
            color={u.color}
            className="mx-auto mb-5 flex h-[132px] w-[132px] items-center justify-center overflow-hidden rounded-full font-display text-[40px] font-bold text-white shadow-[0_14px_28px_-12px_rgba(13,29,26,0.45)]"
          />
          <div className="font-display text-xl leading-tight font-semibold">{u.name}</div>
          <div className="mt-1 text-[13px] text-foreground-secondary">
            {u.designation || roleLabel(u)}
          </div>
          <div className="mt-[18px] inline-flex items-center gap-1.5 rounded-[9px] border-[1.5px] border-border px-3.5 py-2 text-xs font-bold text-foreground-secondary transition-colors group-hover:border-primary group-hover:text-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={PATHS.camera} />
            </svg>
            {photoBusy ? "Saving…" : "Add a profile photo"}
          </div>
        </div>

        <div className="rounded-[18px] border border-border bg-surface px-[26px] py-6 shadow-card">
          <div className="mb-6 border-b border-border pb-4">
            <h2 className="m-0 font-display text-[17px] font-semibold">
              Personnel record
            </h2>
            <p className="mt-1 text-[12.5px] text-foreground-secondary">
              {u.role === "head"
                ? "You manage this for the unit"
                : "Managed by the Unit Head"}
            </p>
          </div>
          <dl>
            {/* Contact details are editable */}
            <div className="grid grid-cols-1 items-center gap-x-6 border-b border-border/60 py-3 sm:grid-cols-[160px_1fr]">
              <dt className="text-[12.5px] text-foreground-secondary">Email</dt>
              <dd className="flex items-center gap-2">
                <input 
                  type="email" 
                  value={editEmail} 
                  onChange={(e) => setEditEmail(e.target.value)} 
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="name@example.com"
                />
              </dd>
            </div>
            <div className="grid grid-cols-1 items-center gap-x-6 border-b border-border/60 py-3 sm:grid-cols-[160px_1fr]">
              <dt className="text-[12.5px] text-foreground-secondary">Phone</dt>
              <dd className="flex items-center gap-2">
                <input 
                  type="tel" 
                  value={editPhone} 
                  onChange={(e) => setEditPhone(e.target.value)} 
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
                  placeholder="+234..."
                />
              </dd>
            </div>
            {(u.email !== editEmail || u.phone !== editPhone) && (
              <div className="grid grid-cols-1 items-center gap-x-6 border-b border-border/60 py-2 sm:grid-cols-[160px_1fr]">
                <dt></dt>
                <dd>
                  <button 
                    onClick={handleSaveContact} 
                    disabled={savingContact}
                    className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-4 text-[13px] font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    {savingContact ? "Saving..." : "Save changes"}
                  </button>
                </dd>
              </div>
            )}
            
            {(
              [
                ["Full name", u.name],
                ["Designation", u.designation || "—"],
                ["Role", roleLabel(u)],
                ["Grade level", u.gradeLevel || "—"],
                ["Sex", u.sex || "—"],
                ["State of origin", u.stateOfOrigin || "—"],
                ["Date joined PSSDC", u.dateJoined ? fmtDate(u.dateJoined) : "—"],
                ["Username", u.username],
              ] as const
            ).map(([k, v]) => (
              <div
                key={k}
                className="grid grid-cols-1 items-baseline gap-x-6 border-b border-border/60 py-2.5 first:pt-0 last:border-none last:pb-0 sm:grid-cols-[160px_1fr]"
              >
                <dt className="text-[12.5px] text-foreground-secondary">{k}</dt>
                <dd
                  className={`text-[13px] font-bold text-foreground ${k === "Username" ? "font-mono" : ""}`}
                >
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 rounded-[10px] border border-border bg-surface-muted p-3 text-[12px] leading-relaxed text-foreground-secondary">
            {u.role !== "head" ? (
              <>
                Spot something out of date? Message the Unit Head via{" "}
                <b className="text-foreground">Connect</b> — these details are kept up
                to date from the Accounting Officer dashboard.
              </>
            ) : (
              <>
                Edit anyone&apos;s record — including your own — from{" "}
                <b className="text-foreground">Team profiles</b> on your Accounting
                Officer dashboard.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
