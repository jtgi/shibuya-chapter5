import { LoaderFunctionArgs } from "@remix-run/node";
import { User as NeynarUser } from "@neynar/nodejs-sdk/build/neynar-api/v2";
import path from "node:path";
import {
  convertTokenIdsToTileIds,
  fetchTokensFor,
  generateGlobalProgress,
  renderProgress,
} from "~/lib/puzzle.server";
import { frameResponse, getSharedEnv, parseMessage } from "~/lib/utils.server";
import { config } from "./_index";

let time = new Date();
const refreshIntervalMillis = 5 * 60 * 1000; // 5 minutes

export async function action({ request }: LoaderFunctionArgs) {
  const json = await request.json();
  const message = await parseMessage(json);

  // Instead of fussing with a cron, everytime a request
  // comes in check if 5m has elapsed, if so regenerate
  // the global progress image.
  if (
    process.env.NODE_ENV === "development" ||
    new Date().getTime() - time.getTime() > refreshIntervalMillis
  ) {
    time = new Date();
    console.log("generating global progress...");

    // don't block
    generateGlobalProgress().catch(console.error);
  }

  const env = getSharedEnv();
  if (json.untrustedData.transactionId && message.action.interactor.fid !== message.action.cast.author.fid) {
    return frameResponse({
      title: config.title,
      description: config.description,
      image: `${env.hostUrl}/postmint.gif`,
      cacheTtlSeconds: 0,
      aspectRatio: "1:1",
      buttons: [
        {
          text: "view tx",
          link: `https://basescan.org/tx/${json.untrustedData.transactionId}`,
        },
        {
          text: "cast",
          link: `https://warpcast.com/~/compose?text=${encodeURIComponent(
            `follow the white rabbit`
          )}&embeds[]=${encodeURIComponent(`${env.hostUrl}?username=${message.action.interactor.username}`)}`,
        },
      ],
    });
  }

  if (
    message.action.interactor.fid !== message.action.cast.author.fid &&
    !message.action.interactor.viewer_context?.following
  ) {
    return frameResponse({
      title: config.title,
      description: config.description,
      image: `${env.hostUrl}/reqs-not-met.gif`,
      cacheTtlSeconds: 0,
      aspectRatio: "1:1",
      buttons: [
        {
          text: "← back",
          target: `${env.hostUrl}/`,
        },
        {
          text: "follow & try again",
          target: `${env.hostUrl}/progress`,
        },
      ],
    });
  }

  const fid = message.action.cast.author.fid;
  const addresses: string[] = message.action.cast.author.verifications.filter((v) => v.startsWith("0x"));
  const mintedTokenIds = await fetchTokensFor(fid, addresses);

  if (mintedTokenIds.length) {
    const env = getSharedEnv();
    const progress = convertTokenIdsToTileIds(mintedTokenIds.map(Number));
    const filename = await renderProgress({
      progress,
      outBasePath: path.join(process.cwd(), process.env.IMG_STORAGE_DIR!),
      isGlobal: false,
    });

    const imagePath = path.join(process.env.IMG_RENDER_DIR!, filename);

    return frameResponse({
      title: config.title,
      description: config.description,
      image: `${env.hostUrl}/${imagePath}`,
      buttons: [
        {
          text: "← back",
          target: `${env.hostUrl}/`,
        },
        {
          text: "zoom +",
          target: `${env.hostUrl}/collected`,
        },
      ],
    });
  } else {
    return frameResponse({
      title: config.title,
      description: config.description,
      image: `${env.hostUrl}/nomints.gif`,
      buttons: [
        {
          text: "← back",
          target: `${env.hostUrl}/`,
        },
        {
          text: "mint 1",
          tx: `${getSharedEnv().hostUrl}/mint?qty=1`,
          postUrl: `${getSharedEnv().hostUrl}/progress`,
        },
        {
          text: "mint 5",
          tx: `${getSharedEnv().hostUrl}/mint?qty=5`,
          postUrl: `${getSharedEnv().hostUrl}/progress`,
        },
      ],
    });
  }
}
