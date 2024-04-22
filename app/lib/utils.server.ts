import sharp from "sharp";
import seedrandom from "seedrandom";
import * as crypto from "crypto";
import { generateFrameSvg } from "./utils";
import axios from "axios";
import { MessageResponse } from "./types";
import { redirect } from "remix-typedjson";

export async function convertSvgToPngBase64(svgString: string) {
  const buffer: Buffer = await sharp(Buffer.from(svgString)).png().toBuffer();
  const base64PNG: string = buffer.toString("base64");
  return `data:image/png;base64,${base64PNG}`;
}

export function getSharedEnv() {
  return {
    infuraProjectId: process.env.INFURA_PROJECT_ID!,
    hostUrl: process.env.NODE_ENV === "production" ? process.env.PROD_URL! : process.env.DEV_URL!,
  };
}

/**
 * determinstically random pieces based on the tokenId
 */
export function tokenIdToPiece(number: number, without: number[]): number {
  const rng = seedrandom(number.toString());
  const totalPuzzlePieces = 200;

  let puzzlePieceIndex = Math.floor(rng() * totalPuzzlePieces);
  if (without.length === totalPuzzlePieces) {
    throw new Error("No more pieces to choose from");
  }

  // there's a 1% chance someone mints the same piece
  // twice since its random, if so just go to the next piece.
  while (without.includes(puzzlePieceIndex)) {
    puzzlePieceIndex = (puzzlePieceIndex + 1) % totalPuzzlePieces;
  }

  return puzzlePieceIndex + 1;
}

export type FrameResponseArgs = {
  title?: string;
  input?: string;
  state?: string;
  aspectRatio?: string;
  description?: string;
  version?: string;
  image: string;
  buttons?: Array<{
    text: string;
    tx?: string;
    link?: string;
    target?: string;
    isRedirect?: boolean;
    postUrl?: string;
  }>;
  postUrl?: string;
  cacheTtlSeconds?: number;
};

export function frameResponse(params: FrameResponseArgs) {
  const version = params.version || "vNext";
  const env = getSharedEnv();

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      ${params.title ? `<title>${params.title}</title>` : ""}
      ${params.title ? `<meta property="og:title" content="${params.title}">` : ""}
      ${
        params.description
          ? `<meta property="description" content="${params.description}">
      <meta property="og:description" content="${params.description}">`
          : ""
      }
      ${`<meta property="fc:frame:image:aspect_ratio" content="${params.aspectRatio ?? "1.91:1"}">`}
      ${params.input ? `<meta property="fc:frame:input:text" content="${params.input}">` : ""}
      <meta property="fc:frame" content="${version}">
      <meta property="fc:frame:image" content="${params.image}">
      ${params.postUrl ? `<meta property="fc:frame:post_url" content="${params.postUrl}">` : ""}
      ${params.state ? `<meta property="fc:frame:state" content="${params.state}">` : ""}
      ${
        params.buttons
          ? params.buttons
              .map((b, index) => {
                let out = `<meta property="fc:frame:button:${index + 1}" content="${b.text}">`;

                if (b.link) {
                  out += `\n<meta property="fc:frame:button:${index + 1}:action" content="link">`;
                  out += `\n<meta property="fc:frame:button:${index + 1}:target" content="${b.link}">`;
                } else if (b.tx) {
                  out += `\n<meta property="fc:frame:button:${index + 1}:action" content="tx">`;
                  out += `\n<meta property="fc:frame:button:${index + 1}:target" content="${b.tx}">`;
                } else if (b.isRedirect) {
                  out += `\n<meta property="fc:frame:button:${index + 1}:action" content="post_redirect">`;
                }

                if (b.postUrl) {
                  out += `\n<meta property="fc:frame:button:${index + 1}:post_url" content="${b.postUrl}">`;
                }

                if (b.target) {
                  out += `\n<meta property="fc:frame:button:${index + 1}:target" content="${b.target}">`;
                }

                return out;
              })
              .join("\n")
          : ""
      }

      <style type="text/css">
      .container {
        padding: 15px;
        height: 100vh;
        max-width: 600px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 35px;
      }

      html, body {
        height: 100vh
        width: 100vw;
        background: linear-gradient(180deg, #121212 0%, #141c26 100%);
      }

      .logowrap {
        display: flex;
        transition: all 1s;
        justify-content: center;
        padding: 0 150px;
        opacity: 0.7;
        padding-bottom: 15px;
      }

      .logowrap:hover {
        opacity: 1;
      }

      .link {
        text-align: center;
        width: 200px;
        color: rgba(255, 255, 255, 0.5);
        text-decoration: none;
        font-size: 10px;
        border-radius: 10px;
        border: 1px solid transparent;
        padding: 0px 25px;
        font-family: 'Helvetica', 'Arial', sans-serif;
        text-transform: uppercase;
        letter-spacing: 2px;
        display: block;
        margin: 0 auto;

      }

      .link:hover {
        color: rgba(255, 255, 255, 0.8);
        transition: color 0.2s;
      }

      .frameImage {
        border-radius: 10px;
        filter: drop-shadow(0px 0px 10px rgba(0,0,0,0.5));
        min-height: 100px;
      }
    </style>
    </head>
    <body>
      <div class="container">
        <img class="frameImage" src="${params.image}" />
        <div>
        <div class="logowrap">
          <a href="https://www.shibuya.xyz/shows/white-rabbit">
            <img width="200" src="${env.hostUrl}/wr-logo.webp" />
          </a>
        </div>
      </div>
    </body>
  </html>
  `;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": `no-store, max-age=${params.cacheTtlSeconds ?? 60 * 15}`,
    },
  });
}

export async function parseMessage(payload: any) {
  const res = await axios.post(
    `https://api.neynar.com/v2/farcaster/frame/validate`,
    {
      message_bytes_in_hex: payload.trustedData.messageBytes,
      follow_context: true,
      cast_reaction_context: true,
    },
    {
      headers: {
        accept: "application/json",
        api_key: process.env.NEYNAR_API_KEY,
        "content-type": "application/json",
        Accept: "application/json",
      },
    }
  );

  const message = res.data as MessageResponse;
  if (!message.valid) {
    throw new Error("Invalid message");
  }

  if (new URL(message.action.url).host !== new URL(getSharedEnv().hostUrl).host) {
    throw new Error("No spoofs sir");
  }

  if (!message.action.cast.author && process.env.NODE_ENV === "production") {
    throw new Error("Cast is not dehydrated. Likely warpcast propagation delays");
  }

  return message;
}
