import { ActionFunctionArgs } from "@remix-run/node";
import path from "node:path";
import { convertTokenIdsToTileIds, encrypt, fetchTokensFor } from "~/lib/puzzle.server";
import { FrameResponseArgs, frameResponse, getSharedEnv, parseMessage } from "~/lib/utils.server";
import { config } from "./_index";

export async function action({ request }: ActionFunctionArgs) {
  const env = getSharedEnv();
  const url = new URL(request.url);
  const json = await request.json();
  const message = await parseMessage(json);

  // only followers can view cast author's tiles
  if (
    message.action.interactor.fid !== message.action.cast.author.fid &&
    !message.action.interactor.viewer_context?.following
  ) {
    return frameResponse({
      title: config.title,
      description: config.description,
      image: `${env.hostUrl}/reqs-not-met.gif`,
      buttons: [
        {
          text: "follow & try again",
          target: `${env.hostUrl}/collected`,
        },
      ],
    });
  }

  const tokenIds = await fetchTokensFor(
    message.action.cast.author.fid,
    message.action.cast.author.verifications.filter((v) => v.startsWith("0x"))
  );

  console.log(`collected [${message.action.cast.author.fid}]`, { tokenIds });

  const defaultButtons: FrameResponseArgs["buttons"] = [
    {
      text: "show all",
      target: `${env.hostUrl}/progress`,
    },
  ];

  if (!tokenIds.length) {
    return frameResponse({
      title: config.title,
      description: config.description,
      image: `${env.hostUrl}/no-mints.png`,
      buttons: [...defaultButtons],
    });
  }

  const tileIds = convertTokenIdsToTileIds(tokenIds.map(Number));
  console.log(`collected [${message.action.cast.author.fid}]`, { tileIds });
  const currentIndex = parseInt(url.searchParams.get("index") ?? "1");

  if (isNaN(currentIndex)) {
    console.error("invalid index", { currentIndex, tileIds });
    return json(
      {
        message: "Something went wrong.",
      },
      {
        status: 400,
      }
    );
  }

  // zoom next/prev stepper
  const tileId = tileIds[currentIndex - 1];
  const [row, column] = tileId;

  // obfuscate so people can't resolve all the tiles
  const encryptedFilename = encrypt(`row-${row}-column-${column}`);
  const tilePath = path.join("seed", encodeURIComponent(encryptedFilename) + ".png");

  const buttons = [];

  if (currentIndex > 1) {
    buttons.push({
      text: "← prev",
      target: `${env.hostUrl}/collected?index=${currentIndex - 1}`,
    });
  }

  if (currentIndex < tileIds.length) {
    buttons.push({
      text: "next →",
      target: `${env.hostUrl}/collected?index=${currentIndex + 1}`,
    });
  }

  return frameResponse({
    title: config.title,
    aspectRatio: "1:1",
    description: config.description,
    image: `${env.hostUrl}/${tilePath}`,
    buttons: [...buttons, ...defaultButtons],
  });
}
