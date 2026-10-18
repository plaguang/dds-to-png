"use client";

import { track } from "@vercel/analytics";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export function isAutomatedOrInternalSession(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return true;
  }
  try {
    if (navigator.webdriver === true) return true;
    const ua = navigator.userAgent || "";
    if (/HeadlessChrome|Playwright|Puppeteer|PhantomJS|Cypress|Lighthouse/i.test(ua)) {
      return true;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("e2e") === "1" || params.get("internal") === "1" || params.get("no_track") === "1") {
      try {
        window.localStorage.setItem("ignore_analytics", "1");
      } catch {
        // ignore
      }
      return true;
    }
    try {
      if (window.localStorage.getItem("ignore_analytics") === "1") {
        return true;
      }
    } catch {
      // ignore
    }
  } catch {
    return false;
  }
  return false;
}

export type ToolEventName =
  | "texture_file_upload"
  | "texture_demo_load"
  | "texture_channel_switch"
  | "texture_mipmap_switch"
  | "texture_download_png"
  | "texture_download_webp";

export function trackToolEvent(
  event: ToolEventName,
  props?: Record<string, string | number | boolean>
) {
  if (isAutomatedOrInternalSession()) return;
  try {
    track(event, props);
  } catch {
    // ignore in dev/offline
  }

  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", event, props ?? {});
    }
  } catch {
    // ignore
  }

  try {
    if (typeof window !== "undefined" && typeof window.clarity === "function") {
      window.clarity("event", event);
      if (props) {
        for (const [k, v] of Object.entries(props)) {
          window.clarity("set", k, String(v));
        }
      }
    }
  } catch {
    // ignore
  }
}
