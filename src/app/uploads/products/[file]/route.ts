import { readProductImage } from "@/lib/product-images";

// Serves uploaded product images. Replacing one changes its ?v=, so a cached copy
// is never shown for a newer image and can be kept for good.
export async function GET(_request: Request, { params }: RouteContext<"/uploads/products/[file]">) {
  const { file } = await params;
  const image = await readProductImage(file);
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
