import type { Metadata } from "next";
import Landing, { type LandingConfig } from "@/components/Landing";

export const metadata: Metadata = {
  title: "Online TGA Viewer – Open & Inspect Truevision Targa (.tga) Files in Browser",
  description:
    "View .tga (Truevision Targa) files online in your browser for free. Inspect RGBA channels, toggle alpha transparency, zoom pixel-by-pixel, and save as PNG.",
  alternates: { canonical: "/tga-viewer" },
};

const config: LandingConfig = {
  badge: "Instant Browser TGA Viewer • R/G/B/Alpha Channel Inspector • Zero Upload",
  h1: "Online TGA File Viewer",
  subtitle:
    "Open Truevision Targa (.tga) images directly in your browser without Photoshop or desktop viewers. Inspect 24-bit and 32-bit TGA textures, isolate RGBA channels, and export to PNG.",
  primaryHint:
    "Drop a .tga file below to inspect its dimensions, bit depth, RLE compression, and color/alpha channels.",
  defaultChannel: "rgba",
  whyTitle: "Fastest Way to Preview .TGA Game & VFX Files",
  whyItems: [
    {
      title: "Works on Windows, Mac & Linux Instantly",
      body: "Operating systems rarely preview .tga files out of the box. Open any Targa image in a browser tab in under 20 milliseconds.",
    },
    {
      title: "Inspect Hidden Alpha & Color Channels",
      body: "Switch effortlessly between RGBA Composite, RGB Solid, Alpha Mask, or individual Red, Green, and Blue channels.",
    },
    {
      title: "1× to 8× Nearest-Neighbor Pixel Zoom",
      body: "Check pixel-art edges, UV seams, and alpha borders without blurry bilinear filtering.",
    },
  ],
  steps: [
    {
      title: "Drop Your .TGA Image",
      body: "Choose any .tga file from your computer — processed 100% locally in your browser.",
    },
    {
      title: "Inspect Channels & Zoom",
      body: "Use the channel selector and zoom controls to inspect RGB colors and alpha masks.",
    },
    {
      title: "Convert to PNG or WebP",
      body: "Need to share the image on Discord, Slack, or docs? Export to PNG or WebP in one click.",
    },
  ],
  faqs: [
    {
      q: "What is a .TGA file?",
      a: "TGA (Truevision Graphics Adapter, or TARGA) is a raster graphics format widely used in video games (Unity, Unreal Engine, Source Engine) and VFX pipelines because it stores uncompressed or lossless RLE 24-bit RGB and 32-bit RGBA data with an explicit alpha channel.",
    },
    {
      q: "Why is my TGA image upside down?",
      a: "Some legacy exporters write TGA scanlines with an inverted Y-origin flag. Simply check 'Flip Vertical (Y)' in the toolbar to flip the texture right-side up before downloading.",
    },
    {
      q: "Is there any file size limit?",
      a: "Because decoding happens inside your own device's memory with zero server upload, you can open high-resolution 4K and 8K TGA textures effortlessly.",
    },
  ],
  jsonLdName: "Online TGA File Viewer",
  jsonLdDescription:
    "Free browser-based Truevision TGA viewer with RGBA channel isolation and PNG export.",
};

export default function TgaViewerPage() {
  return <Landing config={config} />;
}
