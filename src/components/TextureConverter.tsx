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

// 解析 Valve Source 引擎 .VTF (Valve Texture File v7.0 - v7.5) 二进制纹理
function parseVtf(buf: ArrayBuffer, fileName: string): DecodedTexture {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  if (u8.length < 64 || String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== "VTF\0") {
    throw new Error("Invalid VTF header (missing VTF\\0 signature)");
  }

  const verMajor = dv.getUint32(4, true);
  const verMinor = dv.getUint32(8, true);
  const headerSize = dv.getUint32(12, true);
  const width = dv.getUint16(16, true);
  const height = dv.getUint16(18, true);
  const frames = Math.max(1, dv.getUint16(24, true));
  const highResFormat = dv.getInt32(52, true);
  const mipmapCount = Math.max(1, u8[56]);
  const lowResFormat = dv.getInt32(57, true);
  const lowResW = u8[61];
  const lowResH = u8[62];
  const depth = verMajor >= 7 && verMinor >= 2 && headerSize >= 65 ? Math.max(1, dv.getUint16(63, true)) : 1;

  // 计算低分辨率缩略图字节数（通常为 DXT1 = 13）
  let lowResBytes = 0;
  if (lowResW > 0 && lowResH > 0 && lowResFormat === 13) {
    lowResBytes = Math.max(1, Math.ceil(lowResW / 4)) * Math.max(1, Math.ceil(lowResH / 4)) * 8;
  }

  // Source VTF 图像格式枚举映射
  const fmtInfo = (fmt: number): { name: string; bytesPerMip: (w: number, h: number) => number } => {
    const bw = (w: number) => Math.max(1, Math.ceil(w / 4));
    const bh = (h: number) => Math.max(1, Math.ceil(h / 4));
    switch (fmt) {
      case 0:
        return { name: "RGBA8888", bytesPerMip: (w, h) => w * h * 4 };
      case 1:
        return { name: "ABGR8888", bytesPerMip: (w, h) => w * h * 4 };
      case 2:
        return { name: "RGB888", bytesPerMip: (w, h) => w * h * 3 };
      case 3:
      case 12:
        return { name: "BGR888", bytesPerMip: (w, h) => w * h * 3 };
      case 13:
      case 20:
        return { name: "DXT1", bytesPerMip: (w, h) => bw(w) * bh(h) * 8 };
      case 14:
        return { name: "DXT3", bytesPerMip: (w, h) => bw(w) * bh(h) * 16 };
      case 15:
        return { name: "DXT5", bytesPerMip: (w, h) => bw(w) * bh(h) * 16 };
      case 16:
      case 19:
        return { name: "BGRA8888", bytesPerMip: (w, h) => w * h * 4 };
      default:
        throw new Error(`Unsupported VTF pixel format ID (${fmt})`);
    }
  };

  const info = fmtInfo(highResFormat);

  // VTF Mipmap 按从小到大（Smallest -> Largest, Frame -> Face -> Slice）排列在文件末尾
  // 构建从 Mip N-1 到 Mip 0 的尺寸表
  const mipDims: { level: number; w: number; h: number; byteLen: number }[] = [];
  for (let level = 0; level < mipmapCount; level++) {
    const mw = Math.max(1, width >> level);
    const mh = Math.max(1, height >> level);
    mipDims.push({ level, w: mw, h: mh, byteLen: info.bytesPerMip(mw, mh) });
  }

  // 计算高分辨率数据起始偏移：优先使用 headerSize + lowResBytes，若存在 7.3+ 资源目录则从文件尾部反推
  let totalHighResBytes = 0;
  for (const m of mipDims) {
    totalHighResBytes += m.byteLen * frames * depth;
  }
  let pos = headerSize + lowResBytes;
  if (pos + totalHighResBytes > u8.length && u8.length >= totalHighResBytes) {
    pos = u8.length - totalHighResBytes;
  }

  const mips: MipLevel[] = [];
  // 从最小 Mip (mipmapCount - 1) 顺序读取到最大 Mip (0)
  for (let i = mipDims.length - 1; i >= 0; i--) {
    const { level, w: mw, h: mh, byteLen } = mipDims[i];
    if (pos + byteLen > u8.length) break;
    const rgba = new Uint8ClampedArray(mw * mh * 4);
    const bw = Math.max(1, Math.ceil(mw / 4));
    const bh = Math.max(1, Math.ceil(mh / 4));

    if (highResFormat === 13 || highResFormat === 20) {
      let p = pos;
      for (let by = 0; by < bh; by++) {
        for (let bx = 0; bx < bw; bx++) {
          decodeBc1Block(u8, p, rgba, bx * 4, by * 4, mw, mh, false);
          p += 8;
        }
      }
    } else if (highResFormat === 15) {
      let p = pos;
      for (let by = 0; by < bh; by++) {
        for (let bx = 0; bx < bw; bx++) {
          decodeBc3AlphaBlock(u8, p, rgba, bx * 4, by * 4, mw, mh, 3);
          decodeBc1Block(u8, p + 8, rgba, bx * 4, by * 4, mw, mh, true);
          p += 16;
        }
      }
    } else if (highResFormat === 14) {
      let p = pos;
      for (let by = 0; by < bh; by++) {
        for (let bx = 0; bx < bw; bx++) {
          decodeBc1Block(u8, p + 8, rgba, bx * 4, by * 4, mw, mh, true);
          for (let py = 0; py < 4; py++) {
            const y = by * 4 + py;
            if (y >= mh) continue;
            const rowWord = u8[p + py * 2] | (u8[p + py * 2 + 1] << 8);
            for (let px = 0; px < 4; px++) {
              const x = bx * 4 + px;
              if (x < mw) rgba[(y * mw + x) * 4 + 3] = ((rowWord >>> (px * 4)) & 0x0f) * 17;
            }
          }
          p += 16;
        }
      }
    } else if (highResFormat === 0) {
      for (let px = 0; px < mw * mh; px++) {
        const s = pos + px * 4;
        const d = px * 4;
        rgba[d] = u8[s];
        rgba[d + 1] = u8[s + 1];
        rgba[d + 2] = u8[s + 2];
        rgba[d + 3] = u8[s + 3];
      }
    } else if (highResFormat === 16 || highResFormat === 19) {
      for (let px = 0; px < mw * mh; px++) {
        const s = pos + px * 4;
        const d = px * 4;
        rgba[d] = u8[s + 2];
        rgba[d + 1] = u8[s + 1];
        rgba[d + 2] = u8[s];
        rgba[d + 3] = highResFormat === 19 ? 255 : u8[s + 3];
      }
    } else if (highResFormat === 2 || highResFormat === 3 || highResFormat === 12) {
      const isBgr = highResFormat !== 2;
      for (let px = 0; px < mw * mh; px++) {
        const s = pos + px * 3;
        const d = px * 4;
        rgba[d] = isBgr ? u8[s + 2] : u8[s];
        rgba[d + 1] = u8[s + 1];
        rgba[d + 2] = isBgr ? u8[s] : u8[s + 2];
        rgba[d + 3] = 255;
      }
    }

    mips.unshift({ level, width: mw, height: mh, rgba });
    pos += byteLen * frames * depth;
  }

  return {
    fileName,
    format: `VTF v${verMajor}.${verMinor} (${info.name})`,
    width,
    height,
    mips,
    fileSize: u8.length,
  };
}

// 生成内置演示 Valve Source 引擎 VTF v7.2 DXT5 纹理（含 2 级小->大 Mipmap）
export function createDemoVtfBytes(w = 64, h = 64): ArrayBuffer {
  const headerSize = 80;
  const mip1Bytes = (w / 2 / 4) * (h / 2 / 4) * 16; // 32x32 DXT5 = 1024 B
  const mip0Bytes = (w / 4) * (h / 4) * 16; // 64x64 DXT5 = 4096 B
  const buf = new ArrayBuffer(headerSize + mip1Bytes + mip0Bytes);
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);

  // "VTF\0" signature
  u8.set([0x56, 0x54, 0x46, 0x00], 0);
  dv.setUint32(4, 7, true); // major 7
  dv.setUint32(8, 2, true); // minor 2
  dv.setUint32(12, headerSize, true);
  dv.setUint16(16, w, true);
  dv.setUint16(18, h, true);
  dv.setUint32(20, 0x2000, true); // flags (eight bit alpha)
  dv.setUint16(24, 1, true); // 1 frame
  dv.setInt32(52, 15, true); // IMAGE_FORMAT_DXT5 = 15
  u8[56] = 2; // 2 mipmap levels
  dv.setInt32(57, -1, true); // no low-res thumbnail
  u8[61] = 0;
  u8[62] = 0;
  dv.setUint16(63, 1, true); // depth = 1

  const fillMip = (off: number, mw: number, mh: number) => {
    const mbw = mw / 4;
    const mbh = mh / 4;
    for (let by = 0; by < mbh; by++) {
      for (let bx = 0; bx < mbw; bx++) {
        const p = off + (by * mbw + bx) * 16;
        const checker = ((bx >> 1) + (by >> 1)) % 2 === 0;
        const alpha = checker ? 255 : 140;
        u8[p] = alpha;
        u8[p + 1] = alpha;
        // Source Engine orange/amber metallic hazard pattern in RGB565
        const r5 = checker ? 30 : 6;
        const g6 = checker ? 36 : 12;
        const b5 = checker ? 4 : 8;
        const c0 = (r5 << 11) | (g6 << 5) | b5;
        const c1 = ((r5 >> 1) << 11) | ((g6 >> 1) << 5) | b5;
        dv.setUint16(p + 8, c0, true);
        dv.setUint16(p + 10, c1, true);
        dv.setUint32(p + 12, 0x00000000, true);
      }
    }
  };

  // VTF stores smallest mip first (Mip 1: 32x32), then largest mip (Mip 0: 64x64)
  fillMip(headerSize, w / 2, h / 2);
  fillMip(headerSize + mip1Bytes, w, h);
  return buf;
}

// IEEE 754 Half-Float (16-bit) 转 32-bit Float
function decodeFloat16(h: number): number {
  const s = (h & 0x8000) >> 15;
  const e = (h & 0x7c00) >> 10;
  const f = h & 0x03ff;
  if (e === 0) {
    return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
  } else if (e === 0x1f) {
    return f ? NaN : (s ? -Infinity : Infinity);
  }
  return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
}

// ACES Filmic 色调映射 + sRGB Gamma (2.2) 转换，将 HDR 线性亮度转为 0-255 LDR
function acesTonemapToByte(linearVal: number, exposureEv = 0): number {
  const x = Math.max(0, linearVal * Math.pow(2, exposureEv));
  const a = 2.51;
  const b = 0.03;
  const c = 2.43;
  const d = 0.59;
  const e = 0.14;
  const mapped = Math.min(1, Math.max(0, (x * (a * x + b)) / (x * (c * x + d) + e)));
  return Math.round(Math.pow(mapped, 1 / 2.2) * 255);
}

// 解析 Radiance RGBE (.HDR / .PIC) 环境贴图（支持未压缩与新式自适应 RLE）
function parseHdr(buf: ArrayBuffer, fileName: string, exposureEv = 0): DecodedTexture {
  const u8 = new Uint8Array(buf);
  let pos = 0;
  const readLine = (): string => {
    let line = "";
    while (pos < u8.length) {
      const ch = u8[pos++];
      if (ch === 0x0a) break;
      if (ch !== 0x0d) line += String.fromCharCode(ch);
    }
    return line;
  };

  const firstLine = readLine();
  if (!firstLine.startsWith("#?RADIANCE") && !firstLine.startsWith("#?RGBE")) {
    throw new Error("Invalid Radiance .HDR header (missing #?RADIANCE signature)");
  }

  // 读取头部属性直到空行
  while (pos < u8.length) {
    const l = readLine();
    if (l.trim() === "") break;
  }

  // 读取分辨率行，如 "-Y 64 +X 128"
  const resLine = readLine();
  const m = resLine.match(/[-+]Y\s+(\d+)\s+[-+]X\s+(\d+)/i);
  if (!m) {
    throw new Error(`Invalid .HDR resolution string (${resLine})`);
  }
  const height = parseInt(m[1], 10);
  const width = parseInt(m[2], 10);

  const rgbe = new Uint8Array(width * height * 4);

  for (let y = 0; y < height && pos < u8.length; y++) {
    const b0 = u8[pos];
    const b1 = u8[pos + 1];
    const b2 = u8[pos + 2];
    const b3 = u8[pos + 3];

    // 自适应 RLE 扫描线标志：b0==2 && b1==2 && ((b2<<8)|b3) == width
    if (b0 === 2 && b1 === 2 && ((b2 << 8) | b3) === width) {
      pos += 4;
      for (let ch = 0; ch < 4; ch++) {
        let x = 0;
        while (x < width && pos < u8.length) {
          const code = u8[pos++];
          if (code > 128) {
            const runLen = code - 128;
            const val = u8[pos++];
            for (let k = 0; k < runLen && x < width; k++, x++) {
              rgbe[(y * width + x) * 4 + ch] = val;
            }
          } else {
            for (let k = 0; k < code && x < width && pos < u8.length; k++, x++) {
              rgbe[(y * width + x) * 4 + ch] = u8[pos++];
            }
          }
        }
      }
    } else {
      // 未压缩直排 RGBE
      for (let x = 0; x < width && pos + 4 <= u8.length; x++) {
        const d = (y * width + x) * 4;
        rgbe[d] = u8[pos++];
        rgbe[d + 1] = u8[pos++];
        rgbe[d + 2] = u8[pos++];
        rgbe[d + 3] = u8[pos++];
      }
    }
  }

  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * 4;
    const exp = rgbe[s + 3];
    if (exp === 0) {
      rgba[s] = rgba[s + 1] = rgba[s + 2] = 0;
      rgba[s + 3] = 255;
    } else {
      const scale = Math.pow(2, exp - 128 - 8);
      rgba[s] = acesTonemapToByte((rgbe[s] + 0.5) * scale, exposureEv);
      rgba[s + 1] = acesTonemapToByte((rgbe[s + 1] + 0.5) * scale, exposureEv);
      rgba[s + 2] = acesTonemapToByte((rgbe[s + 2] + 0.5) * scale, exposureEv);
      rgba[s + 3] = 255;
    }
  }

  return {
    fileName,
    format: "HDR (Radiance RGBE 32-bit Float)",
    width,
    height,
    mips: [{ level: 0, width, height, rgba }],
    fileSize: u8.length,
  };
}

// 解析 OpenEXR (.EXR v2 未压缩扫描线 Half-Float / Float) 高动态范围纹理
function parseExr(buf: ArrayBuffer, fileName: string, exposureEv = 0): DecodedTexture {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  if (u8.length < 32 || dv.getUint32(0, true) !== 20000630) {
    throw new Error("Invalid OpenEXR file (missing 0x762f3101 magic number)");
  }

  let pos = 8;
  let width = 64;
  let height = 64;
  const channels: { name: string; pType: number }[] = [];

  const readCString = (): string => {
    let s = "";
    while (pos < u8.length && u8[pos] !== 0) {
      s += String.fromCharCode(u8[pos++]);
    }
    pos++; // skip null
    return s;
  };

  while (pos < u8.length) {
    const attrName = readCString();
    if (attrName === "") break; // End of header
    const attrType = readCString();
    const attrSize = dv.getInt32(pos, true);
    pos += 4;
    const nextPos = pos + attrSize;

    if (attrName === "dataWindow" || (attrName === "displayWindow" && width === 64)) {
      const xMin = dv.getInt32(pos, true);
      const yMin = dv.getInt32(pos + 4, true);
      const xMax = dv.getInt32(pos + 8, true);
      const yMax = dv.getInt32(pos + 12, true);
      width = Math.max(1, xMax - xMin + 1);
      height = Math.max(1, yMax - yMin + 1);
    } else if (attrName === "channels" && attrType === "chlist") {
      while (pos < nextPos && u8[pos] !== 0) {
        const chName = readCString();
        const pType = dv.getInt32(pos, true); // 1 = HALF (16-bit), 2 = FLOAT (32-bit)
        pos += 16;
        channels.push({ name: chName.toUpperCase(), pType });
      }
    }
    pos = nextPos;
  }

  if (channels.length === 0) {
    channels.push({ name: "B", pType: 1 }, { name: "G", pType: 1 }, { name: "R", pType: 1 });
  }

  // 跳过 line offset table (height * 8 bytes)
  const offsetTableEnd = pos + height * 8;
  if (offsetTableEnd < u8.length) {
    pos = offsetTableEnd;
  }

  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) rgba[i * 4 + 3] = 255;

  for (let y = 0; y < height && pos + 8 <= u8.length; y++) {
    const scanY = dv.getInt32(pos, true);
    const dataSize = dv.getInt32(pos + 4, true);
    pos += 8;
    const rowIndex = scanY >= 0 && scanY < height ? scanY : y;
    let cPos = pos;

    for (const ch of channels) {
      const bpp = ch.pType === 2 ? 4 : 2;
      for (let x = 0; x < width && cPos + bpp <= u8.length; x++) {
        const val =
          ch.pType === 2
            ? dv.getFloat32(cPos, true)
            : decodeFloat16(dv.getUint16(cPos, true));
        cPos += bpp;
        const dst = (rowIndex * width + x) * 4;
        if (ch.name === "R") rgba[dst] = acesTonemapToByte(val, exposureEv);
        else if (ch.name === "G") rgba[dst + 1] = acesTonemapToByte(val, exposureEv);
        else if (ch.name === "B") rgba[dst + 2] = acesTonemapToByte(val, exposureEv);
        else if (ch.name === "A") rgba[dst + 3] = Math.round(Math.min(1, Math.max(0, val)) * 255);
      }
    }
    pos += dataSize;
  }

  return {
    fileName,
    format: `OpenEXR (${channels.map((c) => c.name).join("")} 16-bit Half-Float)`,
    width,
    height,
    mips: [{ level: 0, width, height, rgba }],
    fileSize: u8.length,
  };
}

// 生成内置演示 OpenEXR (.EXR) 16-bit Half-Float 二进制环境光样本
export function createDemoExrBytes(w = 64, h = 64): ArrayBuffer {
  const enc = new TextEncoder();
  const parts: number[] = [];
  const pushBytes = (arr: number[] | Uint8Array) => {
    for (let i = 0; i < arr.length; i++) parts.push(arr[i]);
  };
  const pushCStr = (s: string) => {
    pushBytes(enc.encode(s));
    parts.push(0);
  };
  const pushInt32 = (v: number) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setInt32(0, v, true);
    pushBytes(b);
  };

  // Magic (20000630) + Version (2)
  pushInt32(20000630);
  pushInt32(2);

  // channels attribute (B, G, R in HALF=1)
  pushCStr("channels");
  pushCStr("chlist");
  const chBytes: number[] = [];
  for (const cn of ["B", "G", "R"]) {
    chBytes.push(cn.charCodeAt(0), 0);
    // pType = 1 (HALF), pLinear = 0, reserved = 0, xSampling = 1, ySampling = 1
    const meta = new Uint8Array(16);
    const mdv = new DataView(meta.buffer);
    mdv.setInt32(0, 1, true);
    mdv.setInt32(8, 1, true);
    mdv.setInt32(12, 1, true);
    for (const b of meta) chBytes.push(b);
  }
  chBytes.push(0);
  pushInt32(chBytes.length);
  pushBytes(chBytes);

  // dataWindow attribute (box2i: 0, 0, w-1, h-1)
  pushCStr("dataWindow");
  pushCStr("box2i");
  pushInt32(16);
  pushInt32(0);
  pushInt32(0);
  pushInt32(w - 1);
  pushInt32(h - 1);

  // End of header
  parts.push(0);

  // Line offset table (h * 8 bytes)
  for (let i = 0; i < h * 8; i++) parts.push(0);

  // Float32 to Float16 encoder for demo HDR sun sky
  const toHalf = (val: number): number => {
    if (val <= 0) return 0;
    const e = Math.floor(Math.log2(val));
    const exp = Math.min(30, Math.max(1, e + 15));
    const mant = Math.round((val / Math.pow(2, exp - 15) - 1) * 1024);
    return (exp << 10) | Math.min(1023, Math.max(0, mant));
  };

  const rowByteSize = w * 3 * 2;
  for (let y = 0; y < h; y++) {
    pushInt32(y);
    pushInt32(rowByteSize);
    const rowBuf = new Uint8Array(rowByteSize);
    const rdv = new DataView(rowBuf.buffer);
    let off = 0;
    // B channel
    for (let x = 0; x < w; x++) {
      const bLinear = 0.25 + (1 - y / h) * 1.8;
      rdv.setUint16(off, toHalf(bLinear), true);
      off += 2;
    }
    // G channel
    for (let x = 0; x < w; x++) {
      const dist = Math.hypot(x - w * 0.5, y - h * 0.35) / (w * 0.25);
      const sun = dist < 1 ? (1 - dist) * 4.5 : 0;
      const gLinear = 0.15 + (y / h) * 0.9 + sun;
      rdv.setUint16(off, toHalf(gLinear), true);
      off += 2;
    }
    // R channel
    for (let x = 0; x < w; x++) {
      const dist = Math.hypot(x - w * 0.5, y - h * 0.35) / (w * 0.25);
      const sun = dist < 1 ? (1 - dist) * 6.0 : 0;
      const rLinear = 0.1 + (x / w) * 1.2 + sun;
      rdv.setUint16(off, toHalf(rLinear), true);
      off += 2;
    }
    pushBytes(rowBuf);
  }

  return new Uint8Array(parts).buffer;
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

// 零依赖生成标准无压缩 (STORE) ZIP 归档二进制，支持一键批量导出数十张转换后的 PNG/WebP 贴图
function buildZipBytes(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const crc32 = (buf: Uint8Array) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

  const enc = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const crc = crc32(f.data);
    const size = f.data.length;

    const local = new Uint8Array(30 + nameBytes.length + size);
    const ldv = new DataView(local.buffer);
    ldv.setUint32(0, 0x04034b50, true);
    ldv.setUint16(4, 20, true);
    ldv.setUint32(14, crc, true);
    ldv.setUint32(18, size, true);
    ldv.setUint32(22, size, true);
    ldv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(f.data, 30 + nameBytes.length);
    localParts.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(central.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, size, true);
    cdv.setUint32(24, size, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralParts.push(central);

    offset += local.length;
  }

  const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(8, files.length, true);
  edv.setUint16(10, files.length, true);
  edv.setUint32(12, centralSize, true);
  edv.setUint32(16, offset, true);

  const total = offset + centralSize + 22;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of localParts) {
    out.set(p, pos);
    pos += p.length;
  }
  for (const p of centralParts) {
    out.set(p, pos);
    pos += p.length;
  }
  out.set(eocd, pos);
  return out;
}

function renderMipToCanvas(mip: MipLevel, channel: ChannelView, flipY: boolean, targetCanvas: HTMLCanvasElement) {
  targetCanvas.width = mip.width;
  targetCanvas.height = mip.height;
  const ctx = targetCanvas.getContext("2d")!;
  const imgData = ctx.createImageData(mip.width, mip.height);
  const src = mip.rgba;
  const dst = imgData.data;
  const w = mip.width;
  const h = mip.height;

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
}

export default function TextureConverter({
  primaryHint,
  defaultChannel = "rgba",
}: {
  primaryHint?: string;
  defaultChannel?: ChannelView;
} = {}) {
  const [batch, setBatch] = useState<DecodedTexture[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [mipIdx, setMipIdx] = useState(0);
  const [channel, setChannel] = useState<ChannelView>(defaultChannel);
  const [flipY, setFlipY] = useState(false);
  const [outFormat, setOutFormat] = useState<OutFormat>("image/png");
  const [zoom, setZoom] = useState<number>(1);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const tex = batch[activeIdx] ?? null;

  async function handleFiles(fileList: FileList | File[]) {
    setError("");
    const arr = Array.from(fileList);
    if (!arr.length) return;
    const decodedList: DecodedTexture[] = [];
    for (const file of arr) {
      try {
        const buf = await file.arrayBuffer();
        const baseName = file.name.replace(/\.[^.]+$/, "");
        const magic = new Uint8Array(buf, 0, Math.min(10, buf.byteLength));
        const magic4 =
          magic.length >= 4 ? String.fromCharCode(magic[0], magic[1], magic[2], magic[3]) : "";
        const magic10 =
          magic.length >= 10
            ? String.fromCharCode(...Array.from(magic.subarray(0, 10)))
            : "";
        const isDds = /\.dds$/i.test(file.name) || magic4 === "DDS ";
        const isVtf = /\.vtf$/i.test(file.name) || magic4 === "VTF\0";
        const isExr =
          /\.exr$/i.test(file.name) ||
          (magic.length >= 4 && new DataView(buf).getUint32(0, true) === 20000630);
        const isHdr =
          /\.hdr$/i.test(file.name) ||
          magic10.startsWith("#?RADIANCE") ||
          magic10.startsWith("#?RGBE");
        const parsed = isDds
          ? parseDds(buf, baseName)
          : isVtf
          ? parseVtf(buf, baseName)
          : isExr
          ? parseExr(buf, baseName)
          : isHdr
          ? parseHdr(buf, baseName)
          : parseTga(buf, baseName);
        decodedList.push(parsed);
      } catch (e) {
        setError((e as Error).message || `Could not decode ${file.name}`);
      }
    }
    if (decodedList.length > 0) {
      setBatch(decodedList);
      setActiveIdx(0);
      setMipIdx(0);
    }
  }

  function loadDemoDds() {
    setError("");
    const buf = createDemoDdsBytes(64, 64);
    const parsed = parseDds(buf, "skyrim-armor-specular-dxt5");
    setBatch([parsed]);
    setActiveIdx(0);
    setMipIdx(0);
  }

  function loadDemoVtf() {
    setError("");
    const buf = createDemoVtfBytes(64, 64);
    const parsed = parseVtf(buf, "hl2-hazard-stripe-vtf72");
    setBatch([parsed]);
    setActiveIdx(0);
    setMipIdx(0);
  }

  function loadDemoExr() {
    setError("");
    const buf = createDemoExrBytes(64, 64);
    const parsed = parseExr(buf, "studio-hdri-sun-sky-16f");
    setBatch([parsed]);
    setActiveIdx(0);
    setMipIdx(0);
  }

  const currentMip = tex?.mips[Math.min(mipIdx, (tex?.mips.length ?? 1) - 1)] ?? null;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !currentMip) return;
    renderMipToCanvas(currentMip, channel, flipY, c);
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
      },
      outFormat,
      0.95
    );
  }

  async function downloadBatchZip() {
    if (!batch.length) return;
    const ext = outFormat === "image/webp" ? "webp" : "png";
    const offscreen = document.createElement("canvas");
    const zipEntries: { name: string; data: Uint8Array }[] = [];

    for (const item of batch) {
      const mip = item.mips[0];
      renderMipToCanvas(mip, channel, flipY, offscreen);
      const blob = await new Promise<Blob | null>((res) => offscreen.toBlob(res, outFormat, 0.95));
      if (blob) {
        const ab = await blob.arrayBuffer();
        zipEntries.push({ name: `${item.fileName}.${ext}`, data: new Uint8Array(ab) });
      }
    }

    const zipBytes = buildZipBytes(zipEntries);
    const zipBlob = new Blob([zipBytes as unknown as BlobPart], { type: "application/zip" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `textures-${channel}-${batch.length}files.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div>
      )}

      {!tex ? (
        <div className="flex flex-col gap-4">
          <label
            className="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 sm:p-10 text-center transition hover:border-indigo-600 active:scale-[0.99]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
            }}
          >
            <input
              type="file"
              multiple
              accept=".dds,.tga,.vtf,.exr,.hdr,image/vnd-ms.dds,image/x-targa,image/x-tga,image/vnd.valve.source.texture,image/x-exr,image/vnd.radiance"
              className="sr-only"
              onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
            />
            <span className="pointer-events-none text-4xl">🎮</span>
            <span className="pointer-events-none text-lg font-semibold">
              Drop one or multiple .DDS / .VTF / .EXR / .HDR / .TGA texture files here (Batch Supported)
            </span>
            <span className="pointer-events-none inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs">
              📂 Tap or Click Here to Select Texture Files
            </span>
            <span className="pointer-events-none text-sm text-slate-500">
              {primaryHint ||
                "Supports DDS (DXT1-DXT5, BC1-BC5, DX10), Valve VTF, OpenEXR (.exr), Radiance (.hdr) & RLE TGA · 100% Local In-Browser"}
            </span>
          </label>
          <div className="flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              onClick={loadDemoDds}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              ✨ Load Demo DXT5 .DDS Texture (With Alpha Mask &amp; Mipmaps)
            </button>
            <button
              type="button"
              onClick={loadDemoVtf}
              className="rounded-lg border border-amber-300 bg-amber-50/70 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              🟠 Load Demo Source Engine .VTF Texture (v7.2 DXT5)
            </button>
            <button
              type="button"
              onClick={loadDemoExr}
              className="rounded-lg border border-sky-300 bg-sky-50/70 px-4 py-2 text-sm font-medium text-sky-900 hover:bg-sky-100"
            >
              ☀️ Load Demo OpenEXR (.EXR) 16-bit HDR Sky
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* 多文件批量切换栏 */}
          {batch.length > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-emerald-900">Batch Queue ({batch.length} files):</span>
                {batch.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveIdx(idx);
                      setMipIdx(0);
                    }}
                    className={`rounded-md px-2.5 py-1 font-medium ${
                      activeIdx === idx
                        ? "bg-emerald-700 text-white"
                        : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {item.fileName} ({item.width}×{item.height})
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={downloadBatchZip}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 font-semibold text-white hover:bg-emerald-800"
              >
                📦 Download All ({batch.length}) as .ZIP
              </button>
            </div>
          )}

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

          {/* 通道检查器 + Mipmap 切换 + 缩放 + 导出控制栏 */}
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

              <label className="flex items-center gap-1.5 font-medium text-slate-700">
                <span>Zoom:</span>
                <select
                  aria-label="Zoom Scale"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="rounded border border-slate-300 bg-white px-2 py-1"
                >
                  <option value={1}>1× Auto</option>
                  <option value={2}>2× Pixel</option>
                  <option value={4}>4× Grid</option>
                  <option value={8}>8× Micro</option>
                </select>
              </label>

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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setBatch([])}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
              >
                New Texture
              </button>
              <button
                type="button"
                onClick={downloadBatchZip}
                className="rounded-lg border border-emerald-700 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                📦 Export .ZIP
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
            className="flex min-h-64 items-center justify-center overflow-auto rounded-xl border border-slate-800 p-6"
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
              className="rounded shadow-lg"
              style={{
                imageRendering: "pixelated",
                width: `${Math.max(192, (currentMip?.width ?? 64) * zoom)}px`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
