import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { withBasePath } from "@/base-path";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pipo's Market — Let's go to the market!",
  description:
    "Unit 7 food words for first grade. Read, write, hear, and say them in English and Spanish.",
  applicationName: "Pipo's Market",
  icons: {
    icon: [{ url: withBasePath("/icons/icon-192.png"), sizes: "192x192", type: "image/png" }],
    apple: [{ url: withBasePath("/icons/icon-192.png"), sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#58cc02",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
