import type { Metadata } from "next";
import Landing, { type LandingConfig } from "@/components/Landing";

export const metadata: Metadata = {
  title: "DDS to PNG Converter Online Free – Decode DXT1/DXT5/BC5 & Fix Black Alpha",
  description:
    "Convert DDS files to PNG or WebP directly in your browser. Supports DXT1, DXT3, DXT5, BC1–BC5, and DX10 headers. Toggle RGB Solid mode to fix invisible/black alpha-packed textures and inspect mipmaps.",
  alternates: { canonical: "/" },
};

const config: LandingConfig = {
  badge: "100% Client-Side • DXT1 / DXT3 / DXT5 / BC1–BC5 / DX10 • Zero Upload",
  h1: "DDS to PNG Converter Online",
  subtitle:
    "Convert DirectDraw Surface (.dds) game textures to lossless PNG or WebP right in your browser. Inspect packed Alpha masks, fix invisible RGB channels with 1 click, and export any mipmap level.",
  primaryHint:
    "Drop any .dds or .tga file below — switch to 'RGB Solid (Ignore Alpha)' if your game texture looks blank or transparent.",
  defaultChannel: "rgba",
  whyTitle: "Why Standard Online DDS Converters Ruin Game Textures",
  whyItems: [
    {
      title: "No More Blank / Black PNG Exports",
      body: "Game engines pack roughness, metallic, or specular masks inside the Alpha channel (setting Alpha=0 on solid surfaces). Standard converters premultiply RGBA and turn your image completely transparent or black. Our 'RGB Solid' mode exports pure un-multiplied RGB.",
    },
    {
      title: "Full Mipmap Chain & Channel Isolation",
      body: "Inspect every embedded mipmap level (Mip 0 down to 1×1) and isolate Red, Green, Blue, or Alpha as grayscale masks to extract packed ORM (Occlusion/Roughness/Metallic) channels.",
    },
    {
      title: "Instant Browser Decoding (No 50 MB Upload Queue)",
      body: "4K and 8K uncompressed or BC-compressed .dds files are decoded directly in your browser via WebAssembly-speed typed arrays. Your textures never leave your computer.",
    },
  ],
  steps: [
    {
      title: "Drop Your .DDS Texture",
      body: "Select any DirectDraw Surface (.dds) or Targa (.tga) file from Skyrim, Fallout, GTA V, Sims 4, Unreal, or Unity.",
    },
    {
      title: "Choose Channel & Mipmap Level",
      body: "Preview RGBA, switch to RGB Solid to ignore alpha masks, or isolate R / G / B / Alpha channels and mip levels.",
    },
    {
      title: "Download Lossless PNG or WebP",
      body: "Export the exact channel view and mipmap level you selected as a crisp 32-bit PNG or WebP image.",
    },
  ],
  faqs: [
    {
      q: "Why does my converted DDS texture look completely transparent or black in other tools?",
      a: "Many games store Specular, Smoothness, or Emission masks in the DDS Alpha channel where Alpha = 0. Ordinary image converters treat Alpha = 0 as invisible and discard the RGB colors. Switch the Channel View to 'RGB Solid (Ignore Alpha)' in TextureLab to recover the full RGB diffuse colors.",
    },
    {
      q: "Which DDS compression formats are supported?",
      a: "TextureLab decodes DXT1 (BC1), DXT3 (BC2), DXT5 (BC3), BC4 (ATI1 single-channel), BC5 (ATI2 dual-channel normal maps with automatic Z-axis reconstruction), DX10 extended headers, and uncompressed 32-bit/24-bit RGBA/BGRA surfaces.",
    },
    {
      q: "Are my game files uploaded to a remote server?",
      a: "No. All block decompression and PNG encoding happen 100% locally inside your browser using JavaScript DataView and HTML5 Canvas.",
    },
  ],
  jsonLdName: "DDS to PNG Converter Online",
  jsonLdDescription:
    "Free browser-based DDS to PNG converter with DXT1/DXT3/DXT5/BC4/BC5 decoding, RGB/Alpha channel isolation, and mipmap inspection.",
};

export default function HomePage() {
  return <Landing config={config} />;
}
