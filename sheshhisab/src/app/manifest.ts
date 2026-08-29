import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "SheshHisab",
    short_name: "SheshHisab",
    description: "Send, request, scan, and track every taka.",
    start_url: "/app?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#f6f8f7",
    theme_color: "#087a55",
    categories: ["finance", "productivity"],
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
    ],
    shortcuts: [
      {
        name: "Pay",
        short_name: "Pay",
        url: "/app/send?source=pwa-shortcut",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Scan",
        short_name: "Scan",
        url: "/app/scan?source=pwa-shortcut",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
