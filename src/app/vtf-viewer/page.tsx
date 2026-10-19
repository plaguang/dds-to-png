import type { Metadata } from "next";
import Landing from "@/components/Landing";

export const metadata: Metadata = {
  title: "VTF Viewer Online Free – Inspect Source Engine .VTF Textures & Mipmaps",
  description:
    "Open and inspect Valve Source Engine .VTF files online without installing VTFEdit. Preview mipmap levels, isolate R/G/B/Alpha channels, and export to PNG.",
  alternates: { canonical: "/vtf-viewer" },
};

export default function VtfViewerPage() {
  return (
    <Landing
      config={{
        badge: "Online VTFEdit Alternative · Mipmap & Alpha Channel Inspector",
        h1: "VTF Viewer Online – Open Valve Texture Files in Browser",
        subtitle:
          "Inspect Source Engine .VTF files (TF2, Garry's Mod, Counter-Strike, Half-Life 2) on Windows, Mac, Linux, or Chromebook without installing VTFEdit. View mipmaps, isolate alpha masks, and zoom up to 8×.",
        primaryHint:
          "Drop .VTF files to inspect format version, mipmap chain, and R/G/B/Alpha channels",
        defaultChannel: "rgb",
        jsonLdName: "VTF Viewer Online",
        jsonLdDescription:
          "Free browser-based Valve Texture File (.vtf) viewer and mipmap inspector with RGBA channel isolation.",
        whyTitle: "Built for TF2, GMod & Source Engine Modders on Any OS",
        whyItems: [
          {
            title: "Works on macOS, Linux & Windows Without VTFEdit",
            body: "VTFEdit requires legacy .NET Windows libraries. Our online VTF viewer runs natively inside any modern browser.",
          },
          {
            title: "Inspect Phong, Self-Illum & Translucent Alpha Masks",
            body: "Isolate the Alpha channel as a grayscale mask or switch to RGB Solid mode with a single click.",
          },
          {
            title: "8× Pixel Grid Zoom & Mipmap Selector",
            body: "Verify how your Source texture downscales across every mipmap level from Mip 0 down to 1×1.",
          },
        ],
        steps: [
          {
            title: "Open Any .VTF Texture",
            body: "Drag and drop your .vtf file or click the 'Load Demo Source Engine .VTF Texture' button to test immediately.",
          },
          {
            title: "Inspect Channels & Mipmaps",
            body: "Use the Channel bar to toggle RGBA, RGB Solid, Alpha Mask, Red, Green, or Blue, and switch Mip levels.",
          },
          {
            title: "Export to PNG or WebP",
            body: "Save the currently inspected channel and mip level directly as a lossless PNG.",
          },
        ],
        faqs: [
          {
            q: "How do I open a .VTF file without downloading VTFEdit?",
            a: "Drag your .vtf file directly into this page. It decodes the Valve Texture File header and DXT blocks locally in your browser and displays the texture immediately.",
          },
          {
            q: "Why does VTF Viewer default to RGB Solid mode?",
            a: "Many Source Engine .vtf files pack non-opacity data into the Alpha channel. Defaulting to RGB Solid ensures you immediately see the color artwork instead of a transparent checkerboard.",
          },
          {
            q: "Can I view smaller mipmap levels inside a VTF file?",
            a: "Yes. Use the Mipmap dropdown in the toolbar to step through every embedded mip level stored in the VTF container.",
          },
          {
            q: "Does this VTF viewer also open .DDS and .TGA textures?",
            a: "Yes—you can drop .DDS, .VTF, and .TGA files together in the same batch queue.",
          },
        ],
      }}
    />
  );
}
