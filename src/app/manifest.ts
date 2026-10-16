import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OrderSathi",
    short_name: "OrderSathi",
    description: "Order desk for electrical wholesalers — turn voice notes, photos and messages into reviewed orders.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f6f4ee",
    theme_color: "#0f0f0e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
