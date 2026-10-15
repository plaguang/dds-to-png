import type { Metadata } from "next";
import Landing, { type LandingConfig } from "@/components/Landing";

export const metadata: Metadata = {
  title: "Online DDS Viewer – Inspect DXT1/DXT5 Mipmaps, Alpha & Normal Maps in Browser",
  description:
    "Free online DDS texture viewer. Open .dds files in your browser without Photoshop or NVIDIA Texture Tools. Inspect mipmap chains, isolate R/G/B/Alpha channels, and preview BC5 normal maps.",
  alternates: { canonical: "/dds-viewer" },
};

const config: LandingConfig = {
  badge: "Instant Browser DDS Inspector • Mipmap Chain • R/G/B/A Channel Isolator",
  h1: "Online DDS Texture Viewer",
  subtitle:
    "Open and inspect DirectDraw Surface (.dds) textures directly in your browser without installing Paint.NET, GIMP plugins, or NVIDIA Texture Tools. Zoom up to 8× pixel grid and inspect individual RGBA channels.",
  primaryHint:
    "Drop a .dds file to inspect header FourCC, dimensions, mipmap pyramid, and individual R/G/B/A channels.",
  defaultChannel: "rgba",
  whyTitle: "Built for Modders, 3D Artists & Technical Artists",
  whyItems: [
    {
      title: "Inspect Channel-Packed ORM Maps",
      body: "Modern PBR shaders pack Ambient Occlusion in Red, Roughness in Green, and Metallic in Blue. Click R, G, or B to view and export each channel as a clean grayscale mask.",
    },
    {
      title: "Automatic BC5 / ATI2 Normal Map Z-Reconstruction",
      body: "2-channel BC5 normal maps often appear yellow-green in basic viewers. Our decoder automatically computes the Z-normal vector so tangent-space normal maps display accurately.",
    },
    {
      title: "Pixel-Exact Zoom & Mipmap Pyramid",
      body: "Step through every mipmap level embedded in the DDS header and use 1×–8× nearest-neighbor zoom to verify block compression artifacts.",
    },
  ],
  steps: [
    {
      title: "Open Any .DDS File",
      body: "Drag and drop a .dds texture from your desktop — no upload wait time and no file size limits.",
    },
    {
      title: "Inspect Channels & Mips",
      body: "Toggle between RGBA, RGB Solid, Alpha Mask, or isolated R/G/B channels and switch mip levels.",
    },
    {
      title: "Save Snapshot as PNG",
      body: "Export any channel view or mip level directly to a standard PNG or WebP file.",
    },
  ],
  faqs: [
    {
      q: "Can I view DDS files on macOS or Linux without installing Windows tools?",
      a: "Yes. Because TextureLab runs entirely in your web browser, you can open and inspect DirectX .dds textures on Mac, Linux, Chromebook, iPad, or Windows immediately.",
    },
    {
      q: "How do I view the Alpha channel of a DDS file separately?",
      a: "Once your file is loaded, click 'Alpha Mask' in the Channel View toolbar. The viewer renders the alpha channel as a high-contrast grayscale image (white = 255 opaque, black = 0 transparent).",
    },
    {
      q: "Does this DDS viewer support DX10 extended headers?",
      a: "Yes. Files with the 'DX10' FourCC signature (covering BC1, BC2, BC3, BC4, BC5, and uncompressed RGBA8/BGRA8 DXGI formats) are automatically parsed.",
    },
  ],
  jsonLdName: "Online DDS Texture Viewer",
  jsonLdDescription:
    "Browser-based DDS file viewer with mipmap inspection, R/G/B/Alpha channel isolation, and PNG export.",
};

export default function DdsViewerPage() {
  return <Landing config={config} />;
}
