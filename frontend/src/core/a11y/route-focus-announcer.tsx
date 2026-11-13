"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useA11y } from "./a11y-context";

const PAGE_METADATA: Record<string, { title: string; announcement: string }> = {
  "/": {
    title: "Home & Savanna Hub - Ableway",
    announcement: "Home page loaded. Welcome to Ableway.",
  },
  "/register": {
    title: "Register as a Learner - Ableway",
    announcement: "Registration page loaded. Form fields can be filled by voice or keyboard.",
  },
  "/courses": {
    title: "Choose a Course - Ableway",
    announcement: "Course Choice page loaded. Three accessible courses available.",
  },
  "/payment": {
    title: "Course Payment and Human Help - Ableway",
    announcement: "Payment page loaded. Human-assisted payment instructions.",
  },
  "/learn": {
    title: "Learning Platform - Ableway",
    announcement: "Learning Platform loaded. Module 1: Principles of Non-Visual Computing.",
  },
  "/profile": {
    title: "Profile and Telegram Settings - Ableway",
    announcement: "Profile page loaded. Manage settings and link Telegram account.",
  },
  "/staff/help-queue": {
    title: "Staff Help Queue - Ableway",
    announcement: "Staff Help Queue loaded. Live assistance requests.",
  },
  "/settings": {
    title: "Accessibility Settings - Ableway",
    announcement: "Settings page loaded. Configure interaction mode, speech rate, voice, language, and theme.",
  },
  "/help": {
    title: "Help and Accessibility Guide - Ableway",
    announcement: "Help page loaded. List of keyboard shortcuts and voice commands.",
  },
  "/savanna": {
    title: "Savanna Learning Portal - Ableway",
    announcement: "Savanna Learning Portal loaded.",
  },
};

export function RouteFocusAnnouncer() {
  const pathname = usePathname();
  const { announce } = useA11y();
  const isFirstRender = useRef(true);

  useEffect(() => {
    const meta = PAGE_METADATA[pathname] || {
      title: `${pathname.replace(/^\//, "").replace(/-/g, " ")} - Ableway`,
      announcement: `Page ${pathname} loaded.`,
    };

    // Rule 4: Update document title
    if (typeof document !== "undefined") {
      document.title = meta.title;
    }

    // Skip focus manipulation on initial hydration so skip link remains first focusable
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Rule 7: Move focus to the new page's h1 (tabindex=-1) and announce in polite live region
    const timer = setTimeout(() => {
      const h1 = document.querySelector("h1");
      if (h1) {
        if (!h1.hasAttribute("tabindex")) {
          h1.setAttribute("tabindex", "-1");
        }
        h1.focus({ preventScroll: false });
      }
      announce(meta.announcement, "polite");
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, announce]);

  return null;
}

