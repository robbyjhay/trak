import { MetadataRoute } from "next";

/**
 * Single source of truth for the PWA manifest (served at /manifest.webmanifest).
 * NOTE: do NOT add a static public/manifest.webmanifest — it would conflict
 * with this route and could silently shadow these values.
 *
 * Chrome installability needs: name, start_url, display (standalone etc.),
 * 192px + 512px icons with purpose "any" (maskable-only does NOT count),
 * a service worker with a fetch handler, and HTTPS in production.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trak",
    short_name: "Trak",
    description: "The Digital Learning Unit's activity & operations register \u2014 PSSDC, Lagos State Government.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0d1d1a",
    theme_color: "#0d1d1a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
