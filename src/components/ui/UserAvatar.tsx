"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { initials } from "@/lib/utils";

/**
 * Unified user/profile avatar (TRAK visual language preserved).
 *
 * Behaviour:
 *   no photoUrl            → initials
 *   photoUrl loads         → image
 *   photoUrl fails (404…)  → initials (no broken-image placeholder)
 *
 * The fallback is driven by actual image load state (`onError`), not by
 * `photoUrl` truthiness alone. Once failed, the <img> unmounts so there is
 * no retry loop; when `photoUrl` changes (e.g. a new upload after a lost
 * legacy file) the failure state resets and the new image is attempted.
 */
export type AvatarDisplay = "image" | "initials";

export function resolveAvatarDisplay(
  photoUrl: string | null | undefined,
  imageFailed: boolean,
): AvatarDisplay {
  return photoUrl && !imageFailed ? "image" : "initials";
}

export type UserAvatarProps = {
  photoUrl?: string | null;
  name: string;
  /** Fallback circle background (user colour). */
  color?: string | null;
  /** Wrapper sizing/shape/typography — passed through from the call site. */
  className?: string;
  /** Image classes — passed through to preserve each call site's look. */
  imgClassName?: string;
  imgAlt?: string;
};

const DEFAULT_IMG_CLASS = "h-full w-full object-cover";

export function UserAvatar({
  photoUrl,
  name,
  color,
  className = "",
  imgClassName = DEFAULT_IMG_CLASS,
  imgAlt = "",
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const prevPhotoUrl = useRef(photoUrl);

  // A new URL means a new load attempt (e.g. re-upload after a lost file).
  // Skipped on first mount on purpose: the mount-time adoption check below
  // must not be clobbered by an unconditional reset.
  useEffect(() => {
    if (prevPhotoUrl.current !== photoUrl) {
      prevPhotoUrl.current = photoUrl;
      setImageFailed(false);
    }
  }, [photoUrl]);

  /**
   * Hydration race: with SSR the browser may finish (and fail) the image
   * load before React attaches `onError`, losing the error event forever.
   * When the <img> commits, synchronously adopt an already-failed load.
   */
  const adoptAlreadyFailedLoad = useCallback(
    (el: HTMLImageElement | null) => {
      if (el && el.complete && el.naturalWidth === 0) {
        setImageFailed(true);
      }
    },
    [photoUrl],
  );

  const display = resolveAvatarDisplay(photoUrl, imageFailed);

  return (
    <div
      className={className}
      style={color ? { background: color } : undefined}
      role="img"
      aria-label={name}
    >
      {display === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={adoptAlreadyFailedLoad}
          src={photoUrl as string}
          alt={imgAlt}
          aria-hidden={imgAlt === ""}
          className={imgClassName}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span aria-hidden>{initials(name || "?")}</span>
      )}
    </div>
  );
}

export default UserAvatar;
