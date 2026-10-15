"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";

export type MipLevel = {
  level: number;
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
};

export type DecodedTexture = {
  fileName: string;
  format: string;
  width: number;
  height: number;
  mips: MipLevel[];
  fileSize: number;
};

type ChannelView = "rgba" | "rgb" | "alpha" | "r" | "g" | "b";
type OutFormat = "image/png" | "image/webp";

function rgb565ToRgb(c: number): [number, number, number] {
  const r = ((c >> 11) & 0x1f) * 255 / 31;
  const g = ((c >> 5) & 0x3f) * 255 / 63;
  const b = (c & 0x1f) * 255 / 31;
  return [Math.round(r), Math.round(g), Math.round(b)];
}

function decodeBc1Block(src: Uint8Array, off: number, out: Uint8ClampedArray, bx: number, by: number, w: number, h: number, hasExplicitOrInterpAlpha = false) {
  const c0 = src[off] | (src[off + 1] << 8);
  const c1 = src[off + 2] | (src[off + 3] << 8);
  const [r0, g0, b0] = rgb565ToRgb(c0);
  const [r1, g1, b1] = rgb565ToRgb(c1);

  const pal: [number, number, number, number][] = [
    [r0, g0, b0, 255],
    [r1, g1, b1, 255],
    [0, 0, 0, 255],
    [0, 0, 0, 255],
  ];

  if (c0 > c1 || hasExplicitOrInterpAlpha) {
    pal[2] = [Math.round((2 * r0 + r1) / 3), Math.round((2 * g0 + g1) / 3), Math.round((2 * b0 + b1) / 3), 255];
    pal[3] = [Math.round((r0 + 2 * r1) / 3), Math.round((g0 + 2 * g1) / 3), Math.round((b0 + 2 * b1) / 3), 255];
  } else {
    pal[2] = [Math.round((r0 + r1) / 2), Math.round((g0 + g1) / 2), Math.round((b0 + b1) / 2), 255];
    pal[3] = [0, 0, 0, 0];
  }

  const bits = src[off + 4] | (src[off + 5] << 8) | (src[off + 6] << 16) | (src[off + 7] * 0x1000000);
  for (let py = 0; py < 4; py++) {
    const y = by + py;
    if (y >= h) continue;
    for (let px = 0; px < 4; px++) {
      const x = bx + px;
      if (x >= w) continue;
      const idx = (py * 4 + px) * 2;
      const code = (bits >>> idx) & 0x03;
      const dst = (y * w + x) * 4;
      out[dst] = pal[code][0];
      out[dst + 1] = pal[code][1];
      out[dst + 2] = pal[code][2];
      if (!hasExplicitOrInterpAlpha) out[dst + 3] = pal[code][3];
    }
  }
}

function decodeBc3AlphaBlock(src: Uint8Array, off: number, out: Uint8ClampedArray, bx: number, by: number, w: number, h: number, channelOffset = 3) {
  const a0 = src[off];
  const a1 = src[off + 1];
  const ap = new Uint8Array(8);
  ap[0] = a0;
  ap[1] = a1;
  if (a0 > a1) {
    for (let i = 1; i <= 6; i++) ap[i + 1] = Math.round(((7 - i) * a0 + i * a1) / 7);
  } else {
    for (let i = 1; i <= 4; i++) ap[i + 1] = Math.round(((5 - i) * a0 + i * a1) / 5);
    ap[6] = 0;
    ap[7] = 255;
  }

  // 48-bit index table (6 bytes: off+2 .. off+7)
  let bitPos = 0;
  for (let py = 0; py < 4; py++) {
    const y = by + py;
    for (let px = 0; px < 4; px++) {
      const x = bx + px;
      const byteIdx = off + 2 + (bitPos >> 3);
      const shift = bitPos & 7;
      let word = src[byteIdx] | ((src[byteIdx + 1] ?? 0) << 8);
      const code = (word >>> shift) & 0x07;
      bitPos += 3;
      if (x < w && y < h) {
        out[(y * w + x) * 4 + channelOffset] = ap[code];
      }
    }
  }
}

export function parseDds(buf: ArrayBuffer, fileName: string): DecodedTexture {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  if (u8.length < 128 || String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== "DDS ") {
    throw new Error("Invalid DDS header (missing 'DDS ' magic)");
  }

  const height = dv.getUint32(12, true);
  const width = dv.getUint32(16, true);
  const mipMapCount = Math.max(1, dv.getUint32(28, true));
  const pfFlags = dv.getUint32(80, true);
  const fourCC = String.fromCharCode(u8[84], u8[85], u8[86], u8[87]);
  const rgbBitCount = dv.getUint32(88, true);
  const rMask = dv.getUint32(92, true);

  let dataOffset = 128;
  let fmt = fourCC.trim() || `RGBA${rgbBitCount}`;

  if (fourCC === "DX10" && u8.length >= 148) {
    const dxgi = dv.getUint32(128, true);
    dataOffset = 148;
    if (dxgi >= 70 && dxgi <= 72) fmt = "DXT1";
    else if (dxgi >= 73 && dxgi <= 75) fmt = "DXT3";
    else if (dxgi >= 76 && dxgi <= 78) fmt = "DXT5";
    else if (dxgi >= 79 && dxgi <= 81) fmt = "BC4";
    else if (dxgi >= 82 && dxgi <= 84) fmt = "BC5";
    else fmt = "RGBA32";
  } else if (fourCC === "ATI1" || fourCC === "BC4U" || fourCC === "BC4S") {
    fmt = "BC4";
  } else if (fourCC === "ATI2" || fourCC === "BC5U" || fourCC === "BC5S") {
    fmt = "BC5";
  } else if (!(pfFlags & 0x04)) {
    fmt = rgbBitCount === 24 ? "RGB24" : "RGBA32";
  }

  const mips: MipLevel[] = [];
  let mw = width;
  let mh = height;

  for (let level = 0; level < Math.min(mipMapCount, 10); level++) {
    const w = Math.max(1, mw);
    const h = Math.max(1, mh);
    const rgba = new Uint8ClampedArray(w * h * 4);

    if (fmt === "DXT1" || fmt === "DXT3" || fmt === "DXT5" || fmt === "BC4" || fmt === "BC5") {
      const blockBytes = fmt === "DXT1" || fmt === "BC4" ? 8 : 16;
      const bw = Math.max(1, Math.ceil(w / 4));
      const bh = Math.max(1, Math.ceil(h / 4));
      const byteLen = bw * bh * blockBytes;
      if (dataOffset + byteLen > u8.length) break;

      for (let by = 0; by < bh; by++) {
        for (let bx = 0; bx < bw; bx++) {
          const boff = dataOffset + (by * bw + bx) * blockBytes;
          const px = bx * 4;
          const py = by * 4;
          if (fmt === "DXT1") {
            decodeBc1Block(u8, boff, rgba, px, py, w, h, false);
          } else if (fmt === "DXT3") {
            decodeBc1Block(u8, boff + 8, rgba, px, py, w, h, true);
            for (let row = 0; row < 4; row++) {
              const y = py + row;
              if (y >= h) continue;
              const word = u8[boff + row * 2] | (u8[boff + row * 2 + 1] << 8);
              for (let col = 0; col < 4; col++) {
                const x = px + col;
                if (x >= w) continue;
                const a4 = (word >>> (col * 4)) & 0x0f;
                rgba[(y * w + x) * 4 + 3] = a4 * 17;
              }
            }
          } else if (fmt === "DXT5") {
            decodeBc1Block(u8, boff + 8, rgba, px, py, w, h, true);
            decodeBc3AlphaBlock(u8, boff, rgba, px, py, w, h, 3);
          } else if (fmt === "BC4") {
            decodeBc3AlphaBlock(u8, boff, rgba, px, py, w, h, 0);
            for (let r = 0; r < 4; r++) {
              for (let c = 0; c < 4; c++) {
                const x = px + c, y = py + r;
                if (x < w && y < h) {
                  const p = (y * w + x) * 4;
                  rgba[p + 1] = rgba[p];
                  rgba[p + 2] = rgba[p];
                  rgba[p + 3] = 255;
                }
              }
            }
          } else if (fmt === "BC5") {
            decodeBc3AlphaBlock(u8, boff, rgba, px, py, w, h, 0);
            decodeBc3AlphaBlock(u8, boff + 8, rgba, px, py, w, h, 1);
            for (let r = 0; r < 4; r++) {
              for (let c = 0; c < 4; c++) {
                const x = px + c, y = py + r;
                if (x < w && y < h) {
                  const p = (y * w + x) * 4;
                  const nx = (rgba[p] / 255) * 2 - 1;
                  const ny = (rgba[p + 1] / 255) * 2 - 1;
                  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
                  rgba[p + 2] = Math.round((nz * 0.5 + 0.5) * 255);
                  rgba[p + 3] = 255;
                }
              }
            }
          }
        }
      }
      dataOffset += byteLen;
    } else {
      const bpp = Math.max(1, Math.floor(rgbBitCount / 8));
      const byteLen = w * h * bpp;
      if (dataOffset + byteLen > u8.length) break;
      const isBgra = rMask === 0x00ff0000;
      for (let i = 0; i < w * h; i++) {
        const s = dataOffset + i * bpp;
        const d = i * 4;
        if (bpp >= 3) {
          rgba[d] = isBgra ? u8[s + 2] : u8[s];
          rgba[d + 1] = u8[s + 1];
          rgba[d + 2] = isBgra ? u8[s] : u8[s + 2];
          rgba[d + 3] = bpp >= 4 ? u8[s + 3] : 255;
        } else {
          rgba[d] = rgba[d + 1] = rgba[d + 2] = u8[s];
          rgba[d + 3] = 255;
        }
      }
      dataOffset += byteLen;
    }

    mips.push({ level, width: w, height: h, rgba });
    if (mw === 1 && mh === 1) break;
    mw = Math.max(1, mw >> 1);
    mh = Math.max(1, mh >> 1);
  }

  return { fileName, format: `DDS (${fmt})`, width, height, mips, fileSize: u8.length };
}

export function parseTga(buf: ArrayBuffer, fileName: string): DecodedTexture {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  if (u8.length < 18) throw new Error("Invalid TGA file");
  const idLen = u8[0];
  const imgType = u8[2];
  const width = dv.getUint16(12, true);
  const height = dv.getUint16(14, true);
  const bpp = u8[16];
  const desc = u8[17];
  const topOrigin = (desc & 0x20) !== 0;
  const bytesPerPx = Math.max(1, bpp >> 3);

  let pos = 18 + idLen;
  const rawPx = new Uint8Array(width * height * 4);
  const totalPx = width * height;

  const writePx = (idx: number, off: number) => {
    const d = idx * 4;
    if (bytesPerPx === 1) {
      rawPx[d] = rawPx[d + 1] = rawPx[d + 2] = u8[off];
      rawPx[d + 3] = 255;
    } else {
      rawPx[d] = u8[off + 2];
      rawPx[d + 1] = u8[off + 1];
      rawPx[d + 2] = u8[off];
      rawPx[d + 3] = bytesPerPx >= 4 ? u8[off + 3] : 255;
    }
  };

  if (imgType === 2 || imgType === 3) {
    for (let i = 0; i < totalPx && pos + bytesPerPx <= u8.length; i++) {
      writePx(i, pos);
      pos += bytesPerPx;
    }
  } else if (imgType === 10 || imgType === 11) {
    let i = 0;
    while (i < totalPx && pos < u8.length) {
      const header = u8[pos++];
      const count = (header & 0x7f) + 1;
      if (header & 0x80) {
        for (let k = 0; k < count && i < totalPx; k++, i++) writePx(i, pos);
        pos += bytesPerPx;
      } else {
        for (let k = 0; k < count && i < totalPx; k++, i++) {
          writePx(i, pos);
          pos += bytesPerPx;
        }
      }
    }
  } else {
    throw new Error(`Unsupported TGA image type (${imgType})`);
  }

  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const srcY = topOrigin ? y : height - 1 - y;
    rgba.set(rawPx.subarray(srcY * width * 4, (srcY + 1) * width * 4), y * width * 4);
  }

  return {
    fileName,
    format: `TGA (${bpp}-bit ${imgType >= 10 ? "RLE" : "Uncompressed"})`,
    width,
    height,
    mips: [{ level: 0, width, height, rgba }],
    fileSize: u8.length,
  };
}

// 生成内置演示 DXT5 .DDS 二进制纹理（含 2 级 Mipmap 与 Alpha 通道遮罩）
export function createDemoDdsBytes(w = 64, h = 64): ArrayBuffer {
  const bw = w / 4;
  const bh = h / 4;
  const mip0Bytes = bw * bh * 16;
  const mip1Bytes = (bw / 2) * (bh / 2) * 16;
  const buf = new ArrayBuffer(128 + mip0Bytes + mip1Bytes);
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);

  // "DDS " magic + 124-byte DDS_HEADER
  u8.set([0x44, 0x44, 0x53, 0x20]);
  dv.setUint32(4, 124, true);
  dv.setUint32(8, 0x21007, true);
  dv.setUint32(12, h, true);
  dv.setUint32(16, w, true);
  dv.setUint32(20, mip0Bytes, true);
  dv.setUint32(28, 2, true); // 2 mipmap levels
  dv.setUint32(76, 32, true);
  dv.setUint32(80, 0x04, true); // DDPF_FOURCC
  u8.set([0x44, 0x58, 0x54, 0x35], 84); // "DXT5"

  const fillMip = (off: number, mw: number, mh: number) => {
    const mbw = mw / 4;
    const mbh = mh / 4;
    for (let by = 0; by < mbh; by++) {
      for (let bx = 0; bx < mbw; bx++) {
        const p = off + (by * mbw + bx) * 16;
        // Alpha block: radial alpha gradient
        const dist = Math.hypot(bx - mbw / 2, by - mbh / 2) / (mbw * 0.7);
        const alpha = Math.max(40, Math.min(255, Math.round((1 - dist * 0.6) * 255)));
        u8[p] = alpha;
        u8[p + 1] = alpha;
        // Color block: vibrant cyber-neon gradient in RGB565
        const r5 = Math.min(31, Math.round((bx / mbw) * 31));
        const g6 = Math.min(63, Math.round((by / mbh) * 63));
        const b5 = 24;
        const c0 = (r5 << 11) | (g6 << 5) | b5;
        const c1 = (b5 << 11) | (r5 << 5) | 12;
        dv.setUint16(p + 8, c0, true);
        dv.setUint16(p + 10, c1, true);
        dv.setUint32(p + 12, (bx + by) % 2 === 0 ? 0x00000000 : 0x55555555, true);
      }
    }
  };

  fillMip(128, w, h);
  fillMip(128 + mip0Bytes, w / 2, h / 2);
  return buf;
}

export default function TextureConverter({
  primaryHint,
  defaultChannel = "rgba",
}: {
  primaryHint?: string;
  defaultChannel?: ChannelView;
} = {}) {
  const [tex, setTex] = useState<DecodedTexture | null>(null);
  const [mipIdx, setMipIdx] = useState(0);
  const [channel, setChannel] = useState<ChannelView>(defaultChannel);
  const [flipY, setFlipY] = useState(false);
  const [outFormat, setOutFormat] = useState<OutFormat>("image/png");
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  async function handleFile(file: File) {
    setError("");
    try {
      const buf = await file.arrayBuffer();
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const magic = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
      const isDds =
        /\.dds$/i.test(file.name) ||
        (magic.length === 4 && String.fromCharCode(magic[0], magic[1], magic[2], magic[3]) === "DDS ");
      const parsed = isDds ? parseDds(buf, baseName) : parseTga(buf, baseName);
      setTex(parsed);
      setMipIdx(0);
      try {
        track("texture_loaded", { format: parsed.format, width: parsed.width, height: parsed.height });
      } catch {
        // ignore
      }
    } catch (e) {
      setError((e as Error).message || "Could not decode texture file.");
    }
  }

  function loadDemoDds() {
    setError("");
    const buf = createDemoDdsBytes(64, 64);
    const parsed = parseDds(buf, "skyrim-armor-specular-dxt5");
    setTex(parsed);
    setMipIdx(0);
    try {
      track("demo_dds_loaded");
    } catch {
      // ignore
    }
  }

  const currentMip = tex?.mips[Math.min(mipIdx, (tex?.mips.length ?? 1) - 1)] ?? null;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !currentMip) return;
    c.width = currentMip.width;
    c.height = currentMip.height;
    const ctx = c.getContext("2d")!;
    const imgData = ctx.createImageData(currentMip.width, currentMip.height);
    const src = currentMip.rgba;
    const dst = imgData.data;
    const w = currentMip.width;
    const h = currentMip.height;

    for (let y = 0; y < h; y++) {
      const sy = flipY ? h - 1 - y : y;
      for (let x = 0; x < w; x++) {
        const s = (sy * w + x) * 4;
        const d = (y * w + x) * 4;
        const r = src[s];
        const g = src[s + 1];
        const b = src[s + 2];
        const a = src[s + 3];

        if (channel === "rgba") {
          dst[d] = r;
          dst[d + 1] = g;
          dst[d + 2] = b;
          dst[d + 3] = a;
        } else if (channel === "rgb") {
          dst[d] = r;
          dst[d + 1] = g;
          dst[d + 2] = b;
          dst[d + 3] = 255;
        } else if (channel === "alpha") {
          dst[d] = dst[d + 1] = dst[d + 2] = a;
          dst[d + 3] = 255;
        } else if (channel === "r") {
          dst[d] = dst[d + 1] = dst[d + 2] = r;
          dst[d + 3] = 255;
        } else if (channel === "g") {
          dst[d] = dst[d + 1] = dst[d + 2] = g;
          dst[d + 3] = 255;
        } else {
          dst[d] = dst[d + 1] = dst[d + 2] = b;
          dst[d + 3] = 255;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, [currentMip, channel, flipY]);

  function downloadConverted() {
    const c = canvasRef.current;
    if (!c || !tex) return;
    const ext = outFormat === "image/webp" ? "webp" : "png";
    c.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${tex.fileName}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        try {
          track("texture_exported", { format: tex.format, ext, channel });
        } catch {
          // ignore
        }
      },
      outFormat,
      0.95
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div>
      )}

      {!tex ? (
        <div className="flex flex-col gap-4">
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center transition hover:border-indigo-600"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
          >
            <input
              type="file"
              accept=".dds,.tga,image/vnd-ms.dds,image/x-targa,image/x-tga"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <span className="text-4xl">🎮</span>
            <span className="text-lg font-semibold">Drop a .DDS or .TGA texture file here (or click to browse)</span>
            <span className="text-sm text-slate-500">
              {primaryHint ||
                "Supports DXT1/BC1, DXT3/BC2, DXT5/BC3, BC4/ATI1, BC5/ATI2 Normal Maps, DX10 & RLE TGA · 100% Local In-Browser"}
            </span>
          </label>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={loadDemoDds}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              ✨ Load Demo DXT5 .DDS Texture (With Alpha Mask &amp; Mipmaps)
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* 纹理元数据概览栏 */}
          <div
            className="grid grid-cols-2 gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs sm:grid-cols-4"
            data-testid="texture-meta"
          >
            <div>
              <span className="text-slate-500">Compression Format</span>
              <div className="mt-0.5 font-semibold text-indigo-900">{tex.format}</div>
            </div>
            <div>
              <span className="text-slate-500">Dimensions</span>
              <div className="mt-0.5 font-semibold text-indigo-900">
                {currentMip?.width} × {currentMip?.height} px
              </div>
            </div>
            <div>
              <span className="text-slate-500">Mipmap Chain</span>
              <div className="mt-0.5 font-semibold text-indigo-900">{tex.mips.length} level(s)</div>
            </div>
            <div>
              <span className="text-slate-500">Active Channel View</span>
              <div className="mt-0.5 font-semibold uppercase text-emerald-700">{channel}</div>
            </div>
          </div>

          {/* 通道检查器 + Mipmap 切换 + 导出控制栏 */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3.5 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-slate-600 mr-1">Channel:</span>
              {(
                [
                  ["rgba", "RGBA"],
                  ["rgb", "RGB Solid (Ignore Alpha)"],
                  ["alpha", "Alpha Mask"],
                  ["r", "Red"],
                  ["g", "Green"],
                  ["b", "Blue"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setChannel(k)}
                  className={`rounded-md border px-2.5 py-1 font-medium ${
                    channel === k
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {tex.mips.length > 1 && (
                <label className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span>Mipmap:</span>
                  <select
                    aria-label="Mipmap Level"
                    value={mipIdx}
                    onChange={(e) => setMipIdx(Number(e.target.value))}
                    className="rounded border border-slate-300 bg-white px-2 py-1"
                  >
                    {tex.mips.map((m, idx) => (
                      <option key={m.level} value={idx}>
                        Mip {m.level} ({m.width}×{m.height})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="inline-flex cursor-pointer items-center gap-1.5 font-medium text-slate-700">
                <input type="checkbox" checked={flipY} onChange={(e) => setFlipY(e.target.checked)} />
                Flip Vertical (Y)
              </label>

              <select
                aria-label="Export Format"
                value={outFormat}
                onChange={(e) => setOutFormat(e.target.value as OutFormat)}
                className="rounded border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700"
              >
                <option value="image/png">Export as PNG</option>
                <option value="image/webp">Export as WebP</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500">
              Tip: If a game texture looks invisible or semi-transparent, switch Channel to{" "}
              <b>RGB Solid (Ignore Alpha)</b> before downloading.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTex(null)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
              >
                New Texture
              </button>
              <button
                type="button"
                onClick={downloadConverted}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                ⬇ Download {outFormat === "image/webp" ? ".WEBP" : ".PNG"} ({currentMip?.width}×{currentMip?.height})
              </button>
            </div>
          </div>

          {/* 棋盘格透明背景纹理画布 */}
          <div
            className="flex min-h-64 items-center justify-center rounded-xl border border-slate-800 p-6"
            style={{
              backgroundImage:
                "linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)",
              backgroundSize: "20px 20px",
              backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
              backgroundColor: "#0f172a",
            }}
          >
            <canvas
              ref={canvasRef}
              className="max-h-[480px] w-auto rounded shadow-lg"
              style={{ imageRendering: "pixelated", minWidth: "192px" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
