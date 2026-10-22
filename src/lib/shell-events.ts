export const OPEN_PALETTE_EVENT = "quill:open-palette";
export const QUICK_CAPTURE_EVENT = "quill:quick-capture";

export function emitShellEvent(name: string) {
  window.dispatchEvent(new Event(name));
}
