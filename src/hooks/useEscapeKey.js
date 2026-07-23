import { useEffect } from "react";

/**
 * Calls `onEscape` when the Escape key is pressed while `active` is true.
 * Used to make modals, dropdowns, and overlays keyboard-dismissible —
 * shared here so every overlay component doesn't reimplement its own
 * document-level keydown listener.
 *
 * @param {() => void} onEscape - called when Escape is pressed
 * @param {boolean} [active=true] - only listens while true (e.g. modal is open)
 */
export function useEscapeKey(onEscape, active = true) {
  useEffect(() => {
    if (!active) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") onEscape();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onEscape, active]);
}
