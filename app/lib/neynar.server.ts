import { NeynarAPIClient } from "@neynar/nodejs-sdk";

export const neynar = new NeynarAPIClient(process.env.NEYNAR_API_KEY!);
