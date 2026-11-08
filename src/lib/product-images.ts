// Where product images are kept and how they're checked. Uploads are saved as
// prod_<product id>.<ext> on this server's disk, so production needs a permanent
// disk. Moving to a storage provider later means changing only this file: the
// database just holds the URL these functions return.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

// Not in public/: Next only serves the public files that existed when it started
const IMAGES_DIR = process.env.PRODUCT_IMAGES_DIR || join(/* turbopackIgnore: true */ process.cwd(), "storage", "products");
const DELETED_DIR = join(IMAGES_DIR, "deleted");

const LOCAL_IMAGE_PATH = "/uploads/products/";
const FILE_NAME = /^prod_[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\.(jpg|png|webp)$/;

const EXTENSIONS = ["jpg", "png", "webp"] as const;
type Extension = (typeof EXTENSIONS)[number];

const CONTENT_TYPES: Record<Extension, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const MAX_IMAGE_MB = 5;
const MAX_PIXELS = 40_000_000;
const MAX_WIDTH = 2000; // what the store requests for its largest images

// The message is safe to show to staff
export class ImageRejectedError extends Error {}

export function isLocalImage(url: string) {
  return url.startsWith(LOCAL_IMAGE_PATH);
}

export type PreparedImage = { data: Buffer; extension: Extension };

// Re-encodes the upload, so what's stored is really an image of the type its
// name says, with no camera location or anything else hidden in the original
export async function prepareUpload(file: File): Promise<PreparedImage> {
  const unreadable = new ImageRejectedError("Upload a JPG, PNG or WebP image.");
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    throw new ImageRejectedError(`Upload an image under ${MAX_IMAGE_MB} MB.`);
  }

  const input = Buffer.from(await file.arrayBuffer());
  const image = sharp(input, { limitInputPixels: MAX_PIXELS }).rotate().resize({
    width: MAX_WIDTH,
    withoutEnlargement: true,
  });
  const { format } = await image.metadata().catch(() => {
    throw unreadable;
  });

  const encoded =
    format === "jpeg"
      ? { image: image.jpeg({ quality: 85 }), extension: "jpg" as const }
      : format === "png"
        ? { image: image.png(), extension: "png" as const }
        : format === "webp"
          ? { image: image.webp({ quality: 85 }), extension: "webp" as const }
          : null;
  if (!encoded) throw unreadable;

  const data = await encoded.image.toBuffer().catch(() => {
    throw unreadable;
  });
  return { data, extension: encoded.extension };
}

// Replaces any file with the same name in one step. Returns the URL to store: the
// version makes browsers and next/image load the new file, not their cached copy.
export async function saveProductImage(productId: string, { data, extension }: PreparedImage) {
  await mkdir(IMAGES_DIR, { recursive: true });
  const temporary = join(IMAGES_DIR, `.upload-${randomUUID()}`);
  await writeFile(temporary, data);
  await rename(temporary, join(IMAGES_DIR, `prod_${productId}.${extension}`));
  return `${LOCAL_IMAGE_PATH}prod_${productId}.${extension}?v=${Date.now()}`;
}

// Removes the product's files, except the one with this extension. For an update
// that changed type, like jpg to png, and for a new product that wasn't created.
export async function removeProductImages(productId: string, keep?: Extension) {
  await Promise.all(
    EXTENSIONS.filter((extension) => extension !== keep).map((extension) =>
      rm(join(IMAGES_DIR, `prod_${productId}.${extension}`), { force: true }),
    ),
  );
}

// Soft delete: off the store, but the file can still be recovered by hand
export async function softDeleteProductImage(productId: string) {
  await mkdir(DELETED_DIR, { recursive: true });
  await Promise.all(
    EXTENSIONS.map((extension) => {
      const name = `prod_${productId}.${extension}`;
      return rename(join(IMAGES_DIR, name), join(DELETED_DIR, name)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    }),
  );
}

// For the route serving uploads. Only exact file names pass, so a request can
// never reach the deleted folder or anything else on the disk.
export async function readProductImage(fileName: string) {
  if (!FILE_NAME.test(fileName)) return null;
  const extension = fileName.slice(fileName.lastIndexOf(".") + 1) as Extension;
  const data = await readFile(join(IMAGES_DIR, fileName)).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  return data && { data, contentType: CONTENT_TYPES[extension] };
}

function matchesSignature(bytes: Uint8Array, contentType: string) {
  const text = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return text(1, 4) === "PNG";
  if (contentType === "image/webp") return text(0, 4) === "RIFF" && text(8, 12) === "WEBP";
  return false;
}

// Asks for the image and checks what comes back, because a link's name proves
// nothing and many image links, like Unsplash's, have no extension. Call only with
// a URL on an approved host: the server makes this request itself.
export async function verifyImageUrl(url: string) {
  const unusable = new ImageRejectedError("That link isn't a JPG, PNG or WebP image.");
  if (/\.(?!jpe?g$|png$|webp$)[a-z0-9]+$/i.test(new URL(url).pathname)) throw unusable;

  let response;
  try {
    response = await fetch(url, {
      headers: { accept: Object.values(CONTENT_TYPES).join(",") },
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new ImageRejectedError("We couldn't load that link. Check it and try again.");
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new ImageRejectedError("We couldn't load that link. Check it and try again.");
  }

  const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  // The start of the file is enough, and the rest may be large
  const reader = response.body?.getReader();
  const first = await reader?.read();
  await reader?.cancel();
  if (!first?.value || !matchesSignature(first.value, contentType)) throw unusable;
}
