import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trak",
    short_name: "Trak",
    description: "The Digital Learning Unit's activity & operations register \u2014 PSSDC, Lagos State Government.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d1d1a",
    theme_color: "#0d1d1a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
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
