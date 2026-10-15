import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://dds-to-png.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/dds-viewer", "/tga-to-png", "/tga-viewer"];
  return routes.map((r) => ({
    url: `${SITE}${r}`,
    lastModified: "2026-10-15",
    changeFrequency: "weekly",
    priority: r === "" ? 1.0 : 0.9,
  }));
}
