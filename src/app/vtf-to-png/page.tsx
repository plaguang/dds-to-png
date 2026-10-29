import type { Metadata } from "next";
import Landing from "@/components/Landing";

export const metadata: Metadata = {
  title: "VTF to PNG Converter Online Free – Batch Convert Valve Source Textures",
  description:
    "Convert Valve Source Engine .VTF (v7.0–v7.5 DXT1, DXT3, DXT5, RGBA8888, BGRA8888) textures to PNG or WebP online. Inspect RGB without Alpha black-out and export batch ZIPs 100% locally.",
  alternates: { canonical: "/vtf-to-png" },
};

export default function VtfToPngPage() {
  return (
    <Landing
      config={{
        badge: "Valve Source Engine (.VTF v7.0–v7.5) · Batch .ZIP Export",
        h1: "VTF to PNG Converter Online Free",
        subtitle:
          "Convert CS:GO, TF2, Garry's Mod, Half-Life 2, and Left 4 Dead Valve Texture Files (.vtf) into crisp PNG or WebP images right in your browser — with RGB Solid mode to fix invisible alpha masks and batch ZIP export.",
        primaryHint:
          "Drop one or multiple .VTF files (DXT1, DXT3, DXT5, RGBA8888, BGRA8888, BGR888) — Zero Server Upload",
        defaultChannel: "rgba",
        autoLoadDemo: "vtf",
        jsonLdName: "VTF to PNG Converter Online",
        jsonLdDescription:
          "Browser-based Valve Texture File (.vtf) to PNG/WebP converter with RGB/Alpha channel isolation, mipmap chain preview, and batch ZIP download.",
        whyTitle: "Why Source Engine Modders Use This VTF to PNG Converter",
        whyItems: [
          {
            title: "No VTFEdit Installation or Buggy Alpha Exports",
            body: "Many Source Engine .vtf textures store phong exponents or self-illum masks inside the Alpha channel, making exported PNGs appear invisible. Toggle 'RGB Solid (Ignore Alpha)' to recover full diffuse color instantly.",
          },
          {
            title: "Mass Batch Convert .VTF to .PNG ZIP",
            body: "Drag an entire materials/ folder of .vtf textures into the dropzone and download all converted PNGs in a single .ZIP archive.",
          },
          {
            title: "Native Reverse-Mipmap VTF v7.0–v7.5 Parser",
            body: "Accurately reads Valve's smallest-to-largest mipmap layout, skips low-res DXT1 thumbnails, and lets you inspect every mip level.",
          },
        ],
        steps: [
          {
            title: "Drop Your .VTF Files",
            body: "Select one or dozens of Valve Source Engine .vtf files from TF2, GMod, CS:S, HL2, or L4D2.",
          },
          {
            title: "Isolate RGB or Alpha Mask",
            body: "Switch between RGBA, RGB Solid (Ignore Alpha), Alpha Mask, or individual R/G/B channels.",
          },
          {
            title: "Download PNG, WebP, or Batch ZIP",
            body: "Export a single mip level as PNG/WebP or click Export .ZIP to download your entire batch.",
          },
        ],
        faqs: [
          {
            q: "Why does my converted VTF texture look transparent or missing parts in PNG?",
            a: "Source Engine materials frequently store specular/phong masks or translucent decals in the Alpha channel. Click 'RGB Solid (Ignore Alpha)' in the channel bar to force 100% opacity and reveal the complete RGB diffuse texture.",
          },
          {
            q: "Which Valve Texture File (.vtf) versions and formats are supported?",
            a: "Our decoder supports VTF versions 7.0 through 7.5, including DXT1, DXT3, DXT5, RGBA8888, ABGR8888, BGRA8888, RGB888, and BGR888 along with full mipmap chains.",
          },
          {
            q: "Can I batch convert multiple VTF files to PNG at once?",
            a: "Yes. Drop multiple .vtf files into the converter and click 'Download All as .ZIP' to get all converted PNGs in one archive.",
          },
          {
            q: "Are my game textures uploaded to a remote server?",
            a: "Never. All VTF binary parsing and DXT block decompression run 100% locally in your browser via WebCanvas.",
          },
        ],
      }}
    />
  );
}
