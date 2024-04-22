import cryptojs from "crypto-js";
import path from "path";
import sharp from "sharp";
import { getOrSet } from "./cache.server";
import { clientsByChainId } from "./viem.server";
import { base } from "viem/chains";
import { getAddress } from "viem";
import { tokenIdToPiece } from "./utils.server";
import { claimAbi } from "./abis";
import axios from "axios";

const rows = 10;
const cols = 20;
const tileWidth = 96;
const tileHeight = 108;
const finalImageWidth = tileWidth * cols;
const finalImageHeight = tileHeight * rows;
export const maxTokensPerFid = 5;

export async function renderProgress(args: {
  progress: number[][];
  isGlobal: boolean;
  outBasePath: string;
  filename?: string;
}) {
  const { progress, isGlobal, outBasePath } = args;
  const compositeOperations: sharp.OverlayOptions[] = [];
  const blankImagePath = path.join(process.cwd(), "public", "blank.jpg");

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < cols; column++) {
      const imagePath = isGlobal
        ? path.join(
            process.cwd(),
            process.env.IMG_GLOBAL_ASSET_DIR!,
            `row-${row + 1}-column-${column + 1}.jpg`
          )
        : path.join(process.cwd(), process.env.IMG_ASSET_DIR!, `row-${row + 1}-column-${column + 1}.png`);

      if (progress.some((r) => r[0] === row + 1 && r[1] === column + 1)) {
        await addTile(compositeOperations, row, column, imagePath);
      } else {
        await addTile(compositeOperations, row, column, blankImagePath);
      }
    }
  }

  // Cache generated images based on concat'd tiles
  // - e.g. 1-1_2-3_4-5.jpg (tiles: [1, 1], [2, 3], [4, 5] are filled in the image)
  // hash filename to avoid exposing
  const filename =
    args.filename ||
    Buffer.from(
      encrypt(
        progress
          .sort((a, b) => a.join("-").localeCompare(b.join("-")))
          .flatMap((r) => r.join("-"))
          .join("_")
      )
    ).toString("base64url") + ".jpg";
  const outPath = `${outBasePath}/${filename}`;

  const finalImage = sharp({
    create: {
      width: finalImageWidth,
      height: finalImageHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(compositeOperations);

  await finalImage.toFile(outPath);
  return filename;
}

async function addTile(
  compositeOperations: sharp.OverlayOptions[],
  row: number,
  column: number,
  imagePath: string
) {
  const imageBuffer = await sharp(imagePath).resize(tileWidth, tileHeight).toBuffer();

  compositeOperations.push({
    input: imageBuffer,
    top: row * tileHeight,
    left: column * tileWidth,
  });
}

export async function fetchTokensFor(fid: number, addresses: string[]) {
  if (!addresses.length) {
    return [];
  }

  const tokens = await getOrSet(
    String(fid),
    async () => {
      const rsp = await axios.get("https://api.simplehash.com/api/v0/nfts/owners", {
        params: {
          chains: "base",
          wallet_addresses: addresses.join(","),
          contract_addresses: process.env.CREATOR_CONTRACT_ADDRESS!,
          count: 1,
          limit: 50,
        },
        headers: {
          "X-API-KEY": process.env.SIMPLE_HASH_API_KEY!,
          accept: "application/json",
        },
      });

      return rsp.data;
    },
    process.env.NODE_ENV === "development" ? 0 : 60 * 5
  );

  return tokens.nfts.map((n: any) => n.token_id).slice(0, maxTokensPerFid);
}

export async function fetchMintedTokens() {
  const client = clientsByChainId[base.id];
  const tokens = await getOrSet(
    "totalSupply",
    async () => {
      const claim = await client.readContract({
        address: getAddress(process.env.CONTRACT_ADDRESS!),
        abi: claimAbi,
        functionName: "getClaim",
        args: [process.env.CREATOR_CONTRACT_ADDRESS! as `0x${string}`, BigInt(process.env.INSTANCE_ID!)],
      });
      return claim.total;
    },
    process.env.NODE_ENV === "development" ? 0 : 60
  );

  return Number(tokens) || 0;
}

export function convertTokenIdsToTileIds(tokenIds: number[]) {
  const coords: number[][] = [];
  const pieceIds: number[] = [];
  for (const id of tokenIds) {
    const pieceId = tokenIdToPiece(id, pieceIds);
    pieceIds.push(pieceId);

    const row = Math.floor(pieceId / cols);
    const column = pieceId % cols;
    coords.push([row + 1, column + 1]);
  }

  return coords;
}

export function encrypt(text: string) {
  return cryptojs.AES.encrypt(text, process.env.SECRET!).toString();
}

export function decrypt(ciphertext: string) {
  const bytes = cryptojs.AES.decrypt(ciphertext, process.env.SECRET!);
  return bytes.toString(cryptojs.enc.Utf8);
}

export async function generateGlobalProgress() {
  const mintedTokens = await fetchMintedTokens();

  if (mintedTokens) {
    const seq = Array.from({ length: mintedTokens }, (_, i) => i + 1);
    const progress = convertTokenIdsToTileIds(seq);
    await renderProgress({
      progress,
      outBasePath: path.join(process.cwd(), "public"),
      filename: "global-progress.jpg",
      isGlobal: true,
    });
  } else {
    console.log("no minted tokens yet, skipping image generation");
  }
}
