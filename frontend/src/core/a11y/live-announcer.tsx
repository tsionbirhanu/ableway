"use client";

import React from "react";
import { useA11y } from "./a11y-context";

/**
 * Shared LiveRegion component conforming to Rule 19.
 * Status changes use aria-live="polite".
 * Urgent alerts use aria-live="assertive".
 * Messages are short and never repeated.
 */
export function LiveAnnouncer() {
  const { lastAnnouncement } = useA11y();

  return (
    <>
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        id="ableway-live-polite"
      >
        {lastAnnouncement}
      </div>
      <div
        className="sr-only"
        aria-live="assertive"
        aria-atomic="true"
        id="ableway-live-assertive"
      />
    </>
  );
}
