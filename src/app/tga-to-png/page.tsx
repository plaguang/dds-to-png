import type { Metadata } from "next";
import Landing, { type LandingConfig } from "@/components/Landing";

export const metadata: Metadata = {
  title: "TGA to PNG Converter Online Free – Fix Blank Alpha Channel & RLE Targa Files",
  description:
    "Convert Truevision TGA (.tga) images to PNG or WebP online in your browser. Supports 8-bit, 24-bit, and 32-bit uncompressed and RLE-compressed TGA textures with RGB Solid mode to fix invisible alpha.",
  alternates: { canonical: "/tga-to-png" },
};

const config: LandingConfig = {
  badge: "Truevision TGA Decoder • Uncompressed & RLE • 8 / 24 / 32-Bit + Alpha Fix",
  h1: "TGA to PNG Converter Online",
  subtitle:
    "Convert Truevision Targa (.tga) textures to lossless PNG or WebP in milliseconds. Recover hidden RGB details when 32-bit TGA files have zeroed alpha channels, or flip vertical Y-orientation in one click.",
  primaryHint:
    "Drop any .tga texture below — supports uncompressed and RLE-compressed 8/24/32-bit TGA files.",
  defaultChannel: "rgb",
  whyTitle: "Why Game Artists Prefer Our Local TGA to PNG Converter",
  whyItems: [
    {
      title: "Fixes Invisible 32-Bit TGA Textures",
      body: "Source Engine, Warcraft III, and Unreal TGA textures frequently store masks in the 4th alpha byte. Defaulting to 'RGB Solid' ensures your exported PNG never comes out blank.",
    },
    {
      title: "Bottom-Left & Top-Left Origin Support",
      body: "TGA files can store scanlines bottom-up or top-down. Our parser reads bit 5 of the TGA image descriptor automatically, plus gives you a manual 'Flip Vertical (Y)' toggle.",
    },
    {
      title: "Zero Cloud Upload Privacy",
      body: "Convert proprietary studio assets and game textures locally inside your browser without waiting for remote server queues.",
    },
  ],
  steps: [
    {
      title: "Select Your .TGA File",
      body: "Drag and drop any 8-bit grayscale, 24-bit RGB, or 32-bit RGBA Truevision TGA file.",
    },
    {
      title: "Verify Alpha & Orientation",
      body: "Toggle between RGB Solid (ignores transparent alpha mask) and RGBA Composite, or isolate the Alpha channel.",
    },
    {
      title: "Download Clean PNG",
      body: "Click 'Download .PNG' to save a standard lossless PNG compatible with every image editor and engine.",
    },
  ],
  faqs: [
    {
      q: "Why does my 32-bit TGA look empty when converted to PNG?",
      a: "In many 3D workflows, artists save a 32-bit TGA where the Alpha channel is black (0) or used as a specular mask. Standard PNG viewers hide pixels where Alpha = 0. Our TGA to PNG page defaults to 'RGB Solid (Ignore Alpha)' so you immediately see and export the full RGB color image.",
    },
    {
      q: "Does this tool support RLE-compressed TGA files?",
      a: "Yes. Both uncompressed (image types 2 and 3) and Run-Length Encoded RLE (image types 10 and 11) TGA files are decoded natively.",
    },
    {
      q: "Can I also export only the Alpha mask from a TGA file?",
      a: "Yes. Click 'Alpha Mask' in the Channel View bar and click 'Download .PNG' to save the alpha mask as a grayscale PNG.",
    },
  ],
  jsonLdName: "TGA to PNG Converter Online",
  jsonLdDescription:
    "Convert uncompressed and RLE Truevision TGA files to PNG or WebP in your browser with RGB/Alpha channel isolation.",
};

export default function TgaToPngPage() {
  return <Landing config={config} />;
}
