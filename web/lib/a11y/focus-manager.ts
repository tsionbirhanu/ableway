/**
 * Utilities for programmatic focus management, ensuring focus is never lost
 * or trapped incorrectly across route changes or modal transitions (IR-1.3).
 */

export function focusElement(elementOrSelector: HTMLElement | string): boolean {
  if (typeof window === "undefined") return false;

  const element =
    typeof elementOrSelector === "string"
      ? (document.querySelector(elementOrSelector) as HTMLElement)
      : elementOrSelector;

  if (element) {
    if (!element.hasAttribute("tabIndex") && element.tabIndex === -1) {
      element.setAttribute("tabindex", "-1");
    }
    element.focus({ preventScroll: false });
    return true;
  }
  return false;
}

export function focusMainContent(): boolean {
  return focusElement("#main-content") || focusElement("main");
}

export function trapFocus(container: HTMLElement, e: KeyboardEvent) {
  if (e.key !== "Tab") return;

  const focusable = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );

  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === first) {
      last.focus();
      e.preventDefault();
    }
  } else {
    if (document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  }
}
