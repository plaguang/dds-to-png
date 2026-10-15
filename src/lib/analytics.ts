"use client";

import { track } from "@vercel/analytics";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export type ToolEventName =
  | "texture_file_upload"
  | "texture_demo_load"
  | "texture_channel_switch"
  | "texture_mipmap_switch"
  | "texture_download_png"
  | "texture_download_webp";

// 统一向 Vercel Analytics、Google Analytics 4 (GA4) 与 Microsoft Clarity 发送工具交互埋点
export function trackToolEvent(
  event: ToolEventName,
  props?: Record<string, string | number | boolean>
) {
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
