"use client";

import { useEffect } from "react";
import { isEditableTarget } from "@/presentation/touch-selection";

function blockCallout(event: Event) {
  if (isEditableTarget(event.target)) return;
  event.preventDefault();
}

/** Long-press must not open the browser word-lookup sheet on lesson text. */
export function TouchCalloutGuard() {
  useEffect(() => {
    document.addEventListener("contextmenu", blockCallout);
    document.addEventListener("selectstart", blockCallout);
    document.addEventListener("dragstart", blockCallout);
    return () => {
      document.removeEventListener("contextmenu", blockCallout);
      document.removeEventListener("selectstart", blockCallout);
      document.removeEventListener("dragstart", blockCallout);
    };
  }, []);
  return null;
}
