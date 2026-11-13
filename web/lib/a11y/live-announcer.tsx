"use client";

import React from "react";
import { useA11y } from "./a11y-context";

/**
 * Renders hidden ARIA live regions for both polite and assertive screen reader announcements.
 * Conforms to WCAG 2.2 AA (IR-1.4: Dynamic changes announced via appropriate ARIA live regions).
 */
export function LiveAnnouncer() {
  const { lastAnnouncement } = useA11y();

  return (
    <div
      style={{
        border: 0,
        clip: "rect(0 0 0 0)",
        height: "1px",
        margin: "-1px",
        overflow: "hidden",
        padding: 0,
        position: "absolute",
        width: "1px",
        whiteSpace: "nowrap",
        wordWrap: "normal",
      }}
      aria-live="polite"
      aria-atomic="true"
      id="ableway-live-announcer"
    >
      {lastAnnouncement}
    </div>
  );
}

