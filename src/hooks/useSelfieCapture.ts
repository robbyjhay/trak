"use client";

import { useCallback, useRef, useState } from "react";

export function useSelfieCapture() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [offerNewTab, setOfferNewTab] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const inIframe = (() => {
    try {
      return typeof window !== "undefined" && window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setPreviewUrl(null);
    setError("");
    setHint("");
    stopStream();
  }, [stopStream]);

  const openCapture = useCallback(async () => {
    setOpen(true);
    setPreviewUrl(null);
    setError("");
    setHint("");
    setOfferNewTab(false);
    stopStream();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        inIframe
          ? "Camera access isn't exposed inside this preview panel."
          : "This browser doesn't expose camera access.",
      );
      setHint(
        inIframe
          ? 'That\'s a restriction the preview panel puts in place — click "Open in new tab" below.'
          : "Try opening Trak in a modern desktop browser like Chrome.",
      );
      setOfferNewTab(inIframe);
      return;
    }

    const chain = [
      { video: { facingMode: "user" as const }, audio: false },
      { video: true, audio: false },
    ];
    let stream: MediaStream | null = null;
    let lastErr: DOMException | null = null;
    for (const constraints of chain) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (e) {
        lastErr = e as DOMException;
        if (
          lastErr?.name === "NotAllowedError" ||
          lastErr?.name === "PermissionDeniedError" ||
          lastErr?.name === "NotFoundError" ||
          lastErr?.name === "DevicesNotFoundError"
        )
          break;
      }
    }

    if (stream) {
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          /* autoplay quirks */
        }
      }
      return;
    }

    const name = lastErr?.name;
    if (
      name === "NotAllowedError" ||
      name === "PermissionDeniedError" ||
      name === "SecurityError"
    ) {
      if (inIframe) {
        setError("Camera access is blocked inside this preview panel.");
        setHint(
          'Click "Open in new tab" below to take the selfie in a full browser tab.',
        );
        setOfferNewTab(true);
      } else {
        setError("Camera permission was blocked for this page.");
        setHint(
          "Check your browser's site settings and allow camera access, then try again.",
        );
      }
    } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      setError("No camera was found on this device.");
      setHint("A selfie needs a working front-facing camera.");
    } else if (name === "NotReadableError" || name === "TrackStartError") {
      setError("The camera is in use by another app, or could not be started.");
      setHint("Close other apps using the camera, then try again.");
    } else {
      setError(
        inIframe
          ? "Camera access isn't exposed inside this preview panel."
          : "This browser view doesn't expose camera access.",
      );
      setOfferNewTab(inIframe);
    }
  }, [inIframe, stopStream]);

  const shoot = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(480, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      video,
      (video.videoWidth - size) / 2,
      (video.videoHeight - size) / 2,
      size,
      size,
      0,
      0,
      480,
      480,
    );
    setPreviewUrl(canvas.toDataURL("image/jpeg", 0.9));
  }, []);

  const retake = useCallback(() => {
    setPreviewUrl(null);
  }, []);

  return {
    open,
    error,
    hint,
    previewUrl,
    offerNewTab,
    videoRef,
    canvasRef,
    openCapture,
    close,
    shoot,
    retake,
    inIframe,
  };
}
