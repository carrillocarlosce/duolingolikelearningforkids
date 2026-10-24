"use client";

import { useEffect } from "react";
import { withBasePath } from "@/base-path";

/** Registers the production service worker. Dev server visits stay uncached. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register(withBasePath("/sw.js"), {
        scope: withBasePath("/"),
        updateViaCache: "none",
      })
      .catch(() => {
        // The site still opens online when the worker cannot install.
      });
  }, []);
  return null;
}
