import sharp from "sharp";

/**
 * Depth map görselinden displacement map üretir.
 * Displacement: beyaz = yüksek (kabartma), siyah = düşük. 3D yazılımlarda yüzey yer değiştirmesi için kullanılır.
 */
export async function depthToDisplacementMap(depthImageBuffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(depthImageBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const channels = info.channels;
  const depth = new Float32Array(width * height);

  let minVal = 255;
  let maxVal = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const val = channels >= 3
        ? (data[i]! + data[i + 1]! + data[i + 2]!) / 3
        : data[i]!;
      depth[y * width + x] = val;
      minVal = Math.min(minVal, val);
      maxVal = Math.max(maxVal, val);
    }
  }

  const range = maxVal - minVal || 1;
  const displacementData = Buffer.alloc(width * height);

  for (let i = 0; i < width * height; i++) {
    const normalized = (depth[i]! - minVal) / range;
    const displacement = Math.round(normalized * 255);
    displacementData[i] = displacement;
  }

  const displacementPng = await sharp(displacementData, {
    raw: { width, height, channels: 1 },
  })
    .png()
    .toBuffer();

  return displacementPng;
}
