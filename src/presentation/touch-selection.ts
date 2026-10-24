/** Real typing fields stay selectable. Everything else is a tap target for a child. */
export function allowsTextSelection(tagName: string, contentEditable: string | null): boolean {
  const tag = tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  if (contentEditable === null) return false;
  return contentEditable.toLowerCase() !== "false";
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) return false;
  const host = target.closest("input, textarea, [contenteditable]");
  if (!host) return false;
  return allowsTextSelection(host.tagName, host.getAttribute("contenteditable"));
}
