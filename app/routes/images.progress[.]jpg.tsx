import fs from "node:fs/promises";
import path from "path";

export async function loader() {
  // note: /images/progress.jpg is always the route
  // but the image that is returned `global-progress.jpg`
  // is generated periodically and returned.
  // this is what allows updating
  const filePath = path.join(process.cwd(), "public", "global-progress.jpg");

  try {
    const pngBuffer = await fs.readFile(filePath);

    // important: cache control N to allow image to be updated
    return new Response(pngBuffer, {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "max-age=0" },
    });
  } catch (error) {
    // in the beginning there will be no tokens minted and
    // no image, serve a placeholder
    console.error("couldnt find image", error);
    const blankImagePath = path.join(process.cwd(), "public", "no-mints.png");
    const pngBuffer = await fs.readFile(blankImagePath);
    return new Response(pngBuffer, {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "max-age=0" },
    });
  }
}
