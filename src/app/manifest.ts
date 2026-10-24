import type { MetadataRoute } from "next";
import { withBasePath } from "@/base-path";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pipo's Market — Let's go to the market!",
    short_name: "Pipo's Market",
    description: "Unit 7 food words in English and Spanish for first grade.",
    id: withBasePath("/"),
    start_url: withBasePath("/"),
    scope: withBasePath("/"),
    display: "standalone",
    background_color: "#fff6e8",
    theme_color: "#58cc02",
    lang: "es",
    icons: [
      {
        src: withBasePath("/icons/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBasePath("/icons/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBasePath("/icons/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
