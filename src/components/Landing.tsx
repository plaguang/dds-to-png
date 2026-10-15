import Link from "next/link";
import TextureConverter from "./TextureConverter";

export interface LandingConfig {
  h1: string;
  badge: string;
  subtitle: string;
  primaryHint: string;
  defaultChannel?: "rgba" | "rgb" | "alpha" | "r" | "g" | "b";
  whyTitle: string;
  whyItems: { title: string; body: string }[];
  steps: { title: string; body: string }[];
  faqs: { q: string; a: string }[];
  jsonLdName: string;
  jsonLdDescription: string;
}

const NAV_LINKS = [
  { href: "/", label: "DDS to PNG" },
  { href: "/dds-viewer", label: "DDS Viewer" },
  { href: "/tga-to-png", label: "TGA to PNG" },
  { href: "/tga-viewer", label: "TGA Viewer" },
];

export default function Landing({ config }: { config: LandingConfig }) {
  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: config.jsonLdName,
    description: config.jsonLdDescription,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any (Web Browser)",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Client-side DDS (DXT1, DXT3, DXT5, BC1-BC5, DX10) and TGA (Uncompressed & RLE) decoding",
      "RGB Solid mode to inspect color channels without Alpha=0 black-out",
      "R / G / B / Alpha channel isolation for packed ORM and Normal maps",
      "Full Mipmap chain inspection and individual mip level PNG/WebP export",
      "100% local browser execution with zero server uploads",
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: config.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Sticky Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-slate-900 text-base">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600 text-white text-xs font-mono">
              DDS
            </span>
            <span>TextureLab</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-600">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-2.5 py-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-10 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <span>🎮</span>
            <span>{config.badge}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            {config.h1}
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            {config.subtitle}
          </p>
        </section>

        {/* Interactive Converter & Channel/Mipmap Inspector */}
        <section aria-label="DDS and TGA Texture Converter">
          <TextureConverter
            primaryHint={config.primaryHint}
            defaultChannel={config.defaultChannel}
          />
        </section>

        {/* How It Works */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
          <h2 className="text-xl font-bold text-slate-900">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {config.steps.map((s, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Step {idx + 1}
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">{s.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why Game Modders & Technical Artists Use This Tool */}
        <section className="space-y-5">
          <h2 className="text-xl font-bold text-slate-900">{config.whyTitle}</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {config.whyItems.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 shadow-xs"
              >
                <h3 className="font-semibold text-slate-900 text-sm">{item.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Supported Formats Table */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">
            Supported Game Texture Compression Formats
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-semibold">Format / FourCC</th>
                  <th className="py-2.5 pr-4 font-semibold">DXGI / Block Type</th>
                  <th className="py-2.5 pr-4 font-semibold">Channels</th>
                  <th className="py-2.5 font-semibold">Common Game / Engine Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-2.5 pr-4 font-mono font-semibold">DXT1 / BC1</td>
                  <td className="py-2.5 pr-4">4×4 Block (8 bytes)</td>
                  <td className="py-2.5 pr-4">RGB + 1-bit Alpha</td>
                  <td className="py-2.5">Opaque albedo/diffuse maps (Skyrim, Fallout, GTA V, Sims 4)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono font-semibold">DXT3 / BC2</td>
                  <td className="py-2.5 pr-4">4×4 Block (16 bytes)</td>
                  <td className="py-2.5 pr-4">RGB + 4-bit Explicit Alpha</td>
                  <td className="py-2.5">Sharp-edge UI icons and decals</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono font-semibold">DXT5 / BC3</td>
                  <td className="py-2.5 pr-4">4×4 Block (16 bytes)</td>
                  <td className="py-2.5 pr-4">RGB + Smooth Interpolated Alpha</td>
                  <td className="py-2.5">Smooth transparency or Alpha-packed Roughness/Specular masks</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono font-semibold">BC4 / ATI1</td>
                  <td className="py-2.5 pr-4">4×4 Block (8 bytes)</td>
                  <td className="py-2.5 pr-4">Single-Channel Grayscale (R)</td>
                  <td className="py-2.5">Heightmaps, Ambient Occlusion (AO), or Metallic masks</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono font-semibold">BC5 / ATI2</td>
                  <td className="py-2.5 pr-4">4×4 Block (16 bytes)</td>
                  <td className="py-2.5 pr-4">Dual-Channel Red + Green + Reconstructed Z</td>
                  <td className="py-2.5">Tangent-space Normal Maps (auto-reconstructs Blue Z channel)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-mono font-semibold">TGA (Truevision)</td>
                  <td className="py-2.5 pr-4">Uncompressed & RLE (8/24/32-bit)</td>
                  <td className="py-2.5 pr-4">RGB / RGBA / Grayscale</td>
                  <td className="py-2.5">Source textures in Source Engine, Unity, Unreal, Warcraft III</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
          <h2 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {config.faqs.map((f, idx) => (
              <div key={idx} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                <h3 className="font-semibold text-slate-900 text-sm">{f.q}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © 2026 TextureLab — 100% Client-Side DDS &amp; TGA Game Texture Inspector.
          </div>
          <div className="flex flex-wrap gap-4">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-slate-800">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
