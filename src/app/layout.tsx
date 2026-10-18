import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://dds-to-png.vercel.app";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-8764ZP2KQ1";
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || "yxcpqk8xbw";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "DDS to PNG Converter Online Free – View RGB Channels, Alpha Mask & Mipmaps",
  description:
    "Convert DDS (DXT1, DXT3, DXT5, BC1-BC5, DX10) and TGA game textures to PNG or WebP directly in your browser. Inspect RGB without premultiplied alpha black-out, isolate R/G/B/A channels, and preview mipmap chains.",
  alternates: { canonical: "/" },
  verification: {
    google: "OzbbXwBKIAGRAIV-NCTTfkOO6b3YAXZjqWxCrmygypM",
  },
  openGraph: {
    title: "DDS & TGA to PNG Converter Online Free – Game Texture Inspector",
    description:
      "Decode DirectDraw Surface (.dds) and Targa (.tga) textures locally in your browser with RGB/Alpha channel isolation and mipmap inspection.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
        <AnalyticsProvider gaId={GA_ID} clarityId={CLARITY_ID} />
      </body>
    </html>
  );
}
