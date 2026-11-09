// Where product images are kept and how they're checked. Uploads are saved to
// Cloudinary as <folder>/prod_<product id>.webp. Moving to another provider later
// means changing only this file: the database just holds the URL these functions
// return.
import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";

const FOLDER = process.env.CLOUDINARY_PRODUCT_FOLDER || "atelier-store/products";
const DELETED_FOLDER = `${FOLDER}/deleted`;

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_FORMATS = ["jpeg", "png", "webp"];

export const MAX_IMAGE_MB = 5;
const MAX_PIXELS = 40_000_000;
const MAX_WIDTH = 2000; // what the store requests for its largest images

// The message is safe to show to staff
export class ImageRejectedError extends Error {}

function storage() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

export function isUploadedImage(url: string) {
  return url.startsWith(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`);
}

// Re-encodes the upload to WebP, so what's stored is really an image, with no
// camera location or anything else hidden in the original
export async function prepareUpload(file: File) {
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
  if (!ACCEPTED_FORMATS.includes(format)) throw unreadable;

  return image
    .webp({ quality: 85 })
    .toBuffer()
    .catch(() => {
      throw unreadable;
    });
}

// Replaces the product's image in one step. Returns the URL to store: its version
// changes with each upload, so browsers and next/image load the new file.
export async function saveProductImage(productId: string, webp: Buffer) {
  const { secure_url: url } = await storage().uploader.upload(`data:image/webp;base64,${webp.toString("base64")}`, {
    public_id: `${FOLDER}/prod_${productId}`,
    asset_folder: FOLDER,
    resource_type: "image",
    overwrite: true,
    invalidate: true,
  });
  return url;
}

// For a new product that wasn't created
export async function removeProductImage(productId: string) {
  await storage().uploader.destroy(`${FOLDER}/prod_${productId}`, { invalidate: true });
}

// Soft delete: off the store, but the file can still be recovered by hand. A
// product using a link has no file, which Cloudinary reports as not found.
export async function softDeleteProductImage(productId: string) {
  const name = `prod_${productId}`;
  const moved = await storage()
    .uploader.rename(`${FOLDER}/${name}`, `${DELETED_FOLDER}/${name}`, { overwrite: true, invalidate: true })
    .catch((error: { http_code?: number }) => {
      if (error.http_code !== 404) throw error;
      return null;
    });
  // Renaming doesn't change the folder it's listed under in Cloudinary
  if (moved) await storage().api.update(moved.public_id, { asset_folder: DELETED_FOLDER });
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
      headers: { accept: ACCEPTED_TYPES.join(",") },
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
