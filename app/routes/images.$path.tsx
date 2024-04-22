import { LoaderFunctionArgs } from "@remix-run/node";
import fs from "node:fs/promises";
import path from "path";

export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.path) {
    return new Response("Not found", { status: 404 });
  }

  const [file, ext] = params.path.split(".");
  const filePath = path.join(
    process.env.NODE_ENV === "production" ? "/" : "",
    process.env.IMG_STORAGE_DIR!,
    params.path
  );

  try {
    const pngBuffer = await fs.readFile(filePath);
    return new Response(pngBuffer, {
      headers: { "Content-Type": "image/jpeg" },
    });
  } catch (error) {
    console.error("couldnt find image", error);
    return new Response("Not found", { status: 404 });
  }
}
