import type { Metadata } from "next";
import Landing from "@/components/Landing";

export const metadata: Metadata = {
  title: "EXR to PNG Converter Online Free – 16/32-bit OpenEXR Tone-Mapped Export",
  description:
    "Convert OpenEXR (.exr) 16-bit half-float and 32-bit float HDR render passes and environment maps to PNG or WebP online with ACES Filmic tone-mapping. 100% local in-browser.",
  alternates: { canonical: "/exr-to-png" },
};

export default function ExrToPngPage() {
  return (
    <Landing
      config={{
        badge: "OpenEXR (.EXR) 16-bit Half-Float & 32-bit Float · ACES Filmic Tone-Mapping",
        h1: "EXR to PNG Converter Online Free",
        subtitle:
          "Convert Blender, Unreal Engine, Maya, V-Ray, and Cinema 4D OpenEXR (.exr) renders and HDRI skies into crisp sRGB PNG or WebP images locally in your browser — with ACES Filmic tone-mapping so bright highlights never blow out.",
        primaryHint:
          "Drop one or multiple .EXR files (16-bit Half-Float or 32-bit Float) — Zero Server Upload",
        defaultChannel: "rgba",
        jsonLdName: "EXR to PNG Converter Online",
        jsonLdDescription:
          "Client-side OpenEXR (.exr) to PNG/WebP converter with ACES Filmic tone-mapping, R/G/B/A channel isolation, and batch ZIP export.",
        whyTitle: "Why 3D & VFX Artists Use This EXR to PNG Converter",
        whyItems: [
          {
            title: "ACES Filmic Tone-Mapping Prevents Blown Highlights",
            body: "Naive EXR-to-PNG converters clip every pixel above 1.0 to pure white. Our decoder applies ACES Filmic curve + sRGB 2.2 gamma compression so sun discs and specular highlights retain natural roll-off.",
          },
          {
            title: "Inspect R, G, B & Alpha Render Channels",
            body: "Isolate individual Red, Green, Blue, or Alpha channels from multi-channel EXR passes and export any channel directly to PNG.",
          },
          {
            title: "100% Local Browser Processing (Zero Cloud Upload)",
            body: "EXR files from studio renders are large and confidential. Everything decodes inside your browser's RAM with zero upload wait time.",
          },
        ],
        steps: [
          {
            title: "Drop Your .EXR File(s)",
            body: "Drag in OpenEXR files from Blender, V-Ray, Arnold, or PolyHaven, or click 'Load Demo OpenEXR (.EXR) 16-bit HDR Sky'.",
          },
          {
            title: "Inspect Channels & Pixel Grid",
            body: "Switch between RGBA, RGB Solid, Alpha Mask, or R/G/B channels and zoom up to 8×.",
          },
          {
            title: "Download Tone-Mapped PNG or Batch ZIP",
            body: "Export clean 8-bit sRGB PNG/WebP files or download your entire batch as a .ZIP archive.",
          },
        ],
        faqs: [
          {
            q: "Why do my EXR files look washed out or overexposed in other online converters?",
            a: "OpenEXR stores linear floating-point radiance values that often exceed 1.0. Without proper tone-mapping and linear-to-sRGB gamma conversion, highlights clip to white and midtones look flat. Our converter applies ACES Filmic tone-mapping automatically.",
          },
          {
            q: "Can I convert multiple EXR frames or passes to PNG at once?",
            a: "Yes. Drop multiple .exr files into the converter and click 'Download All as .ZIP' to batch-export every frame as PNG or WebP.",
          },
          {
            q: "Does this tool upload my confidential 3D renders to a server?",
            a: "Never. All OpenEXR IEEE-754 half-float decoding and canvas rendering happen 100% locally inside your web browser.",
          },
          {
            q: "Can I also convert Radiance .HDR environment maps here?",
            a: "Yes—our decoder natively supports both OpenEXR (.exr) and Radiance RGBE (.hdr) files alongside .dds, .vtf, and .tga textures.",
          },
        ],
      }}
    />
  );
}
