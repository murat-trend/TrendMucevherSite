import sharp from "sharp";

/**
 * Depth map görselinden normal map üretir.
 * Depth gradient → surface normal → RGB normal map formatı.
 */
export async function depthToNormalMap(depthImageBuffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(depthImageBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const channels = info.channels;
  const depth = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      depth[y * width + x] = channels >= 3
        ? (data[i]! + data[i + 1]! + data[i + 2]!) / 3
        : data[i]!;
    }
  }

  const scale = 4;
  const normalData = Buffer.alloc(width * height * 3);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const x0 = Math.max(0, x - 1);
      const x1 = Math.min(width - 1, x + 1);
      const y0 = Math.max(0, y - 1);
      const y1 = Math.min(height - 1, y + 1);

      const dx = (depth[y * width + x1]! - depth[y * width + x0]!) * scale;
      const dy = (depth[y1 * width + x]! - depth[y0 * width + x]!) * scale;

      let nx = -dx;
      let ny = -dy;
      let nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;

      const outIdx = idx * 3;
      normalData[outIdx] = Math.round(((nx + 1) / 2) * 255);
      normalData[outIdx + 1] = Math.round(((ny + 1) / 2) * 255);
      normalData[outIdx + 2] = Math.round(((nz + 1) / 2) * 255);
    }
  }

  const normalPng = await sharp(normalData, {
    raw: { width, height, channels: 3 },
  })
    .png()
    .toBuffer();

  return normalPng;
}
