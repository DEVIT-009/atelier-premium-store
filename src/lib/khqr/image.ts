// Renders a KHQR string as a PNG data URL with a small round Bakong icon in
// the centre. Decoding 40 orders with jsQR and ZXing: at 12% width with error
// correction Q it reads exactly as well as the plain code (16% did not; H was
// denser and worse when small). Whole-pixel squares, shown with
// image-rendering: pixelated. Any icon problem falls back to the plain QR.
import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";

const MODULE_PX = 8; // whole pixels per QR square: uneven squares hurt scanners
const ICON_RATIO = 0.12; // icon diameter as a share of the QR width
const ICON_BORDER = 6; // white ring so no module touches the icon

let iconSource: Promise<Buffer> | undefined;

function readIcon() {
  iconSource ??= readFile(path.join(process.cwd(), "public/assets/bakong.png"));
  return iconSource;
}

const circle = (size: number, fill: string) =>
  Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${fill}"/></svg>`,
  );

async function roundBadge(qrWidth: number) {
  const iconSize = Math.round(qrWidth * ICON_RATIO);
  const badgeSize = iconSize + ICON_BORDER * 2;

  const icon = await sharp(await readIcon())
    .resize(iconSize, iconSize)
    .composite([{ input: circle(iconSize, "#fff"), blend: "dest-in" }])
    .png()
    .toBuffer();

  return sharp(circle(badgeSize, "#fff"))
    .composite([{ input: icon, top: ICON_BORDER, left: ICON_BORDER }])
    .png()
    .toBuffer();
}

export async function renderKhqrPng(qr: string) {
  const plain = await QRCode.toBuffer(qr, {
    errorCorrectionLevel: "Q",
    margin: 2,
    scale: MODULE_PX,
  });

  let png = plain;
  try {
    const { width = 0 } = await sharp(plain).metadata();
    png = await sharp(plain)
      .composite([{ input: await roundBadge(width), gravity: "center" }])
      .png()
      .toBuffer();
  } catch (error) {
    iconSource = undefined; // retry reading the file next time
    console.error("KHQR icon skipped", error);
  }
  return `data:image/png;base64,${png.toString("base64")}`;
}
