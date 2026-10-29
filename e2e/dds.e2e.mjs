import { chromium } from "playwright-core";
import fs from "node:fs";

const BASE = process.env.URL || "http://localhost:3120";
const CHROMIUM_EXECUTABLE =
  "/Users/pla/Library/Caches/ms-playwright/chromium-1155/chrome-mac/Chromium.app/Contents/MacOS/Chromium";

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ 断言失败: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

// 构造一个 16x16 32-bit 未压缩 TGA 测试文件（带半透明/0 Alpha 像素以验证 RGB Solid）
function buildTestTgaBuffer(w = 16, h = 16) {
  const header = Buffer.alloc(18, 0);
  header[2] = 2; // Uncompressed True-Color
  header.writeUInt16LE(w, 12);
  header.writeUInt16LE(h, 14);
  header[16] = 32; // 32-bit BGRA
  header[17] = 0x28; // Top-left origin + 8-bit alpha
  const pixels = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    pixels[i * 4 + 0] = 40; // B
    pixels[i * 4 + 1] = 180; // G
    pixels[i * 4 + 2] = 240; // R
    pixels[i * 4 + 3] = i % 2 === 0 ? 0 : 255; // 交替 Alpha=0 测试
  }
  return Buffer.concat([header, pixels]);
}

async function run() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });
  const context = await browser.newContext({ acceptDownloads: true });
  await context.route(/googletagmanager|google-analytics|clarity\.ms|_vercel\/insights/i, (route) => route.abort());
  const page = await context.newPage();

  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto(BASE, { waitUntil: "load", timeout: 30000 });

  const title = await page.title();
  assert(title.includes("DDS to PNG"), `页面标题正确 (${title})`);

  // 1. 顶部吸顶导航包含全部 9 个工具入口
  const navCount = await page.locator("header nav a").count();
  assert(navCount === 9, `顶部吸顶导航包含全部 9 个工具入口 (实际 ${navCount})`);

  // 2. 验证自动化测试环境已屏蔽统计污染
  const isBlocked = await page.evaluate(() => navigator.webdriver === true && typeof window.gtag === "undefined");
  assert(isBlocked, "自动化测试环境已成功屏蔽 GA4 / Clarity / Vercel 统计污染");

  // 3. 点击加载内置 64x64 2-mip DXT5 .DDS 演示纹理
  await page.getByRole("button", { name: /Load Demo DXT5 \.DDS Texture/i }).click();

  const meta = page.getByTestId("texture-meta");
  await meta.waitFor({ state: "visible", timeout: 5000 });
  const metaText = await meta.innerText();
  assert(metaText.includes("DDS (DXT5)"), `成功解码 DXT5 压缩格式 (${metaText.replace(/\s+/g, " ")})`);
  assert(metaText.includes("64 × 64 px"), "Mip 0 分辨率 64 × 64 px 正确");
  assert(metaText.includes("2 level(s)"), "正确识别 2 层 Mipmap 链");

  // 4. 切换通道视图（RGB Solid / Alpha Mask / Red）
  await page.getByRole("button", { name: "RGB Solid (Ignore Alpha)" }).click();
  assert((await meta.innerText()).includes("RGB"), "成功切换到 RGB Solid 通道模式");

  await page.getByRole("button", { name: "Alpha Mask" }).click();
  assert((await meta.innerText()).includes("ALPHA"), "成功切换到 Alpha Mask 通道模式");

  // 5. 切换 Mipmap 层级到 Mip 1 (32x32)
  const mipSelect = page.getByLabel("Mipmap Level");
  await mipSelect.selectOption("1");
  assert((await meta.innerText()).includes("32 × 32 px"), "切换到 Mip 1 后分辨率更新为 32 × 32 px");

  // 切回 Mip 0 并导出 PNG，校验 PNG 魔数 89 50 4E 47
  await mipSelect.selectOption("0");
  await page.getByRole("button", { name: "RGB Solid (Ignore Alpha)" }).click();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Download \.PNG/i }).click(),
  ]);
  const dlPath = await download.path();
  const dlBuf = fs.readFileSync(dlPath);
  assert(
    dlBuf[0] === 0x89 && dlBuf[1] === 0x50 && dlBuf[2] === 0x4e && dlBuf[3] === 0x47,
    `导出的 .PNG 文件头魔数正确 (${dlBuf.length} bytes)`
  );

  // 6. 点击 New Texture 并测试 Valve Source Engine .VTF v7.2 纹理加载与反向 Mipmap 解码
  await page.getByRole("button", { name: "New Texture" }).click();
  await page.getByRole("button", { name: /Load Demo Source Engine \.VTF Texture/i }).click();
  await meta.waitFor({ state: "visible", timeout: 5000 });
  const vtfMeta = await meta.innerText();
  assert(
    vtfMeta.includes("VTF v7.2 (DXT5)") && vtfMeta.includes("64 × 64 px") && vtfMeta.includes("2 level(s)"),
    `成功解码 Valve Source .VTF v7.2 (DXT5) 纹理与 2 级反向 Mipmap (${vtfMeta.replace(/\s+/g, " ")})`
  );

  // 6a-2. 点击 New Texture 并测试 OpenEXR (.EXR) 16-bit Half-Float 样本加载与 ACES 色调映射
  await page.getByRole("button", { name: "New Texture" }).click();
  await page.getByRole("button", { name: /Load Demo OpenEXR \(\.EXR\) 16-bit HDR Sky/i }).click();
  await meta.waitFor({ state: "visible", timeout: 5000 });
  const exrMeta = await meta.innerText();
  assert(
    exrMeta.includes("OpenEXR (BGR 16-bit Half-Float)") && exrMeta.includes("64 × 64 px"),
    `成功解码 OpenEXR 16-bit Half-Float HDR 纹理 (${exrMeta.replace(/\s+/g, " ")})`
  );

  // 6b. 点击 New Texture 并上传自定义 32-bit .TGA 二进制文件
  await page.getByRole("button", { name: "New Texture" }).click();
  const tgaBuf = buildTestTgaBuffer(16, 16);
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "character_albedo.tga",
    mimeType: "image/x-tga",
    buffer: tgaBuf,
  });

  await meta.waitFor({ state: "visible", timeout: 5000 });
  const tgaMeta = await meta.innerText();
  assert(tgaMeta.includes("TGA") && tgaMeta.includes("16 × 16 px"), "成功解码上传的 32-bit .TGA 纹理 (16×16)");

  // 6c. 验证导出 .ZIP 归档魔数 (PK\x03\x04 = 0x50 0x4B 0x03 0x04)
  const [zipDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Export \.ZIP/i }).click(),
  ]);
  const zipPath = await zipDownload.path();
  const zipBuf = fs.readFileSync(zipPath);
  assert(
    zipBuf[0] === 0x50 && zipBuf[1] === 0x4b && zipBuf[2] === 0x03 && zipBuf[3] === 0x04,
    `导出的批量贴图 .ZIP 归档魔数正确 (${zipBuf.length} bytes)`
  );

  // 7. 校验全部子路由及 SEO 路由 HTTP 200
  for (const route of [
    "/dds-viewer",
    "/vtf-to-png",
    "/vtf-viewer",
    "/exr-to-png",
    "/exr-viewer",
    "/hdr-to-png",
    "/tga-to-png",
    "/tga-viewer",
    "/sitemap.xml",
    "/robots.txt",
    "/llms.txt",
  ]) {
    const res = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    assert(res && res.status() === 200, `路由 ${route} 返回 HTTP 200`);
  }

  await page.goto(`${BASE}/?utm_source=chatgpt.com`, { waitUntil: "networkidle" });
  const aiAttr = await page.locator("html").getAttribute("data-ai-referral");
  assert(aiAttr === "openai:chatgpt", `GEOInflow AI 引荐归因成功识别 html[data-ai-referral="${aiAttr}"]`);

  // 验证 /vtf-to-png 与 /exr-viewer 首屏自动预加载对应的 VTF / EXR 交互式纹理检查器
  await page.goto(`${BASE}/vtf-to-png`, { waitUntil: "networkidle" });
  const vtfAutoMeta = await page.getByTestId("texture-meta").innerText();
  assert(vtfAutoMeta.includes("VTF v7.2 (DXT5)"), `/vtf-to-png 首屏自动预加载 VTF 纹理 (${vtfAutoMeta.replace(/\s+/g, " ")})`);

  await page.goto(`${BASE}/exr-viewer`, { waitUntil: "networkidle" });
  const exrAutoMeta = await page.getByTestId("texture-meta").innerText();
  assert(exrAutoMeta.includes("OpenEXR"), `/exr-viewer 首屏自动预加载 OpenEXR 纹理 (${exrAutoMeta.replace(/\s+/g, " ")})`);

  assert(pageErrors.length === 0, `无页面 JS 错误 (${pageErrors.length})`);

  await browser.close();
  console.log("\n全部通过 🎉");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
