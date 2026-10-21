import type { Metadata } from "next";
import Landing from "@/components/Landing";

export const metadata: Metadata = {
  title: "EXR Viewer Online Free – Inspect OpenEXR HDR Renders & Channels in Browser",
  description:
    "Open and inspect OpenEXR (.exr) 16-bit and 32-bit floating-point files directly in your browser. Isolate R/G/B/Alpha channels, zoom 8×, and export to PNG.",
  alternates: { canonical: "/exr-viewer" },
};

export default function ExrViewerPage() {
  return (
    <Landing
      config={{
        badge: "Instant In-Browser OpenEXR Inspector · R/G/B/Alpha Channel Isolation",
        h1: "EXR Viewer Online – Open & Inspect .EXR Files in Browser",
        subtitle:
          "Preview OpenEXR (.exr) renders, cryptomatte/utility masks, and 16-bit HDRI lighting maps on Windows, macOS, Linux, or Chromebook without launching Blender, Nuke, or Photoshop.",
        primaryHint:
          "Drop .EXR files to inspect resolution, floating-point channels, and tone-mapped preview",
        defaultChannel: "rgb",
        jsonLdName: "EXR Viewer Online",
        jsonLdDescription:
          "Browser-based OpenEXR (.exr) image viewer with ACES Filmic tone-mapping and R/G/B/Alpha channel inspection.",
        whyTitle: "Built for 3D Generalists, Compositors & Technical Artists",
        whyItems: [
          {
            title: "Instant Preview Without Launching Heavy DCC Apps",
            body: "Verify render output frames or downloaded PolyHaven EXR skies in milliseconds right inside a browser tab.",
          },
          {
            title: "Single-Click R / G / B / Alpha Isolation",
            body: "Check packed roughness, metallic, depth, or alpha mattes stored inside individual EXR color channels.",
          },
          {
            title: "Zero Server Upload Privacy",
            body: "Studio assets and unreleased game textures stay 100% on your local machine.",
          },
        ],
        steps: [
          {
            title: "Open Any .EXR File",
            body: "Drag your .exr file into the viewer or click 'Load Demo OpenEXR (.EXR) 16-bit HDR Sky' to test immediately.",
          },
          {
            title: "Isolate Channels & Zoom",
            body: "Toggle RGBA, RGB Solid, Alpha Mask, Red, Green, or Blue, and inspect pixel details at up to 8× zoom.",
          },
          {
            title: "Save Snapshot as PNG or WebP",
            body: "Download the tone-mapped view or isolated channel as a lossless PNG.",
          },
        ],
        faqs: [
          {
            q: "How can I open an .EXR file on Windows or Mac without installing software?",
            a: "Drag and drop your .exr file onto this page. It parses the OpenEXR v2 header and floating-point scanlines directly in your browser.",
          },
          {
            q: "Why does my EXR file show black or transparent areas in standard viewers?",
            a: "In compositing pipelines, the Alpha channel of an EXR pass may store 0.0 for sky pixels or hold a custom mask. Switching to 'RGB Solid (Ignore Alpha)' reveals the full color pass.",
          },
          {
            q: "Can I batch-view multiple EXR files?",
            a: "Yes. Drop multiple .exr files to switch between them in the Batch Queue bar and export all of them as a .ZIP of PNGs.",
          },
          {
            q: "What other 3D texture formats does this viewer support?",
            a: "Alongside OpenEXR (.exr), you can open Radiance (.hdr), DirectDraw Surface (.dds), Valve Source (.vtf), and Truevision (.tga) files.",
          },
        ],
      }}
    />
  );
}
