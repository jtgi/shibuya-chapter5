import { LoaderFunctionArgs } from "@remix-run/node";
import fs from "node:fs/promises";
import path from "path";
import { decrypt } from "~/lib/puzzle.server";

export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.path) {
    return new Response("Not found", { status: 404 });
  }

  const filename = params.path.split(".")[0];
  const decryptedFilename = decrypt(decodeURIComponent(filename));

  const filePath = path.join(
    process.env.NODE_ENV === "production" ? "/" : "",
    process.env.IMG_ASSET_DIR!,
    `${decryptedFilename}.png`
  );

  try {
    const buffer = await fs.readFile(filePath);
    return new Response(buffer, {
      headers: { "Content-Type": "image/png" },
    });
  } catch (error) {
    console.error("couldnt find image", error);
    return new Response("Not found", { status: 404 });
  }
}
