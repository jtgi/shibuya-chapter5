import { LoaderFunctionArgs } from "@remix-run/node";
import { frameResponse, getSharedEnv } from "~/lib/utils.server";

export const config = {
  title: "follow the white rabbit",
  description: "mint to reveal",
};

export const action = handler;
export const loader = handler;

async function handler({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const username = url.searchParams.get("username");

  return frameResponse({
    title: config.title,
    description: config.description,
    image: `${getSharedEnv().hostUrl}/images/progress.jpg`,
    postUrl: `${getSharedEnv().hostUrl}/progress`,
    cacheTtlSeconds: 0,
    buttons: [
      {
        text: username ? `@${username}'s tiles` : `show collected`,
        target: `${getSharedEnv().hostUrl}/progress`,
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
