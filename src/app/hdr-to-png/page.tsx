import type { Metadata } from "next";
import Landing from "@/components/Landing";

export const metadata: Metadata = {
  title: "HDR to PNG Converter Online Free – Radiance RGBE (.HDR) Tone-Mapped Export",
  description:
    "Convert Radiance RGBE (.hdr) 32-bit environment maps and skyboxes to sRGB PNG or WebP online with ACES Filmic tone-mapping. 100% client-side in your browser.",
  alternates: { canonical: "/hdr-to-png" },
};

export default function HdrToPngPage() {
  return (
    <Landing
      config={{
        badge: "Radiance RGBE (.HDR) Decoder · ACES Filmic Tone-Mapping · Batch .ZIP",
        h1: "HDR to PNG Converter Online Free",
        subtitle:
          "Convert 32-bit Radiance (.hdr) equirectangular environment maps and studio lighting setups into clean sRGB PNG or WebP thumbnails locally in your browser — with adaptive RLE decoding and ACES Filmic tone-mapping.",
        primaryHint:
          "Drop one or multiple Radiance .HDR files (Uncompressed or Adaptive RLE) — 100% Local",
        defaultChannel: "rgb",
        jsonLdName: "HDR to PNG Converter Online",
        jsonLdDescription:
          "Client-side Radiance RGBE (.hdr) to PNG/WebP converter with ACES Filmic tone-mapping and batch ZIP download.",
        whyTitle: "Why 3D Artists & WebGL Developers Use This HDR to PNG Converter",
        whyItems: [
          {
            title: "True Radiance RGBE Exponent Decoding",
            body: "Decodes the shared 8-bit exponent (E) and mantissa channels (R, G, B) of #?RADIANCE and #?RGBE files, including new-style adaptive RLE scanlines.",
          },
          {
            title: "ACES Filmic Tone-Mapping to 8-bit sRGB",
            body: "Compresses high dynamic range sun and studio light sources smoothly into standard 8-bit PNG or WebP images without harsh color clipping.",
          },
          {
            title: "Batch Convert .HDR Libraries to .ZIP",
            body: "Generate lightweight PNG/WebP catalog previews for dozens of .hdr environment maps in one click.",
          },
        ],
        steps: [
          {
            title: "Drop Your .HDR Environment Map(s)",
            body: "Select one or multiple Radiance .hdr files from your 3D asset library.",
          },
          {
            title: "Preview Tone-Mapped Output",
            body: "Inspect the ACES Filmic tone-mapped equirectangular panorama in the interactive canvas.",
          },
          {
            title: "Export PNG, WebP, or Batch ZIP",
            body: "Download lossless PNGs or compressed WebP previews instantly.",
          },
        ],
        faqs: [
          {
            q: "What is a Radiance .HDR file?",
            a: "A Radiance .HDR (or .PIC) file stores 32-bit floating-point lighting data using 8 bits each for Red, Green, and Blue mantissas plus an 8-bit shared exponent, widely used for 3D environment lighting in Blender, Three.js, and Unreal Engine.",
          },
          {
            q: "How do I convert an .HDR skybox to a regular .PNG image?",
            a: "Drop your .hdr file into the converter above. It decodes the RGBE scanlines, applies ACES Filmic tone-mapping and sRGB gamma correction, and lets you download the .PNG immediately.",
          },
          {
            q: "Are my .HDR files uploaded to a cloud server?",
            a: "No. All Radiance RGBE decoding and PNG generation run 100% locally inside your web browser.",
          },
          {
            q: "Does this converter also support OpenEXR (.exr) files?",
            a: "Yes. Both Radiance (.hdr) and OpenEXR (.exr) high-dynamic-range files are supported.",
          },
        ],
      }}
    />
  );
}
