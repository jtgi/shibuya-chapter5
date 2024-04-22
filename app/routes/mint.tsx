import { ActionFunctionArgs, json } from "@remix-run/node";
import { typedjson } from "remix-typedjson";
import { parseEther, encodeFunctionData, erc721Abi } from "viem";
import { baseSepolia, base, sepolia } from "viem/chains";
import { claimAbi, manifoldAbi, zoraAbi } from "~/lib/abis";
import { fetchTokensFor, maxTokensPerFid } from "~/lib/puzzle.server";
import { frameResponse, getSharedEnv, parseMessage } from "~/lib/utils.server";
import { clientsByChainId } from "~/lib/viem.server";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const env = getSharedEnv();
    const data = await request.json();
    const message = await parseMessage(data);

    const url = new URL(request.url);
    const qty = parseInt(url.searchParams.get("qty") || "1");

    const tokens = await fetchTokensFor(
      message.action.interactor.fid,
      message.action.interactor.verifications.filter((v) => v.startsWith("0x"))
    );

    if (tokens.length >= maxTokensPerFid) {
      return json(
        {
          message: "You have already minted the maximum number of tokens.",
        },
        {
          status: 400,
        }
      );
    }

    const finalQty = Math.min(qty, maxTokensPerFid - tokens.length);
    const mintPrice = parseEther("0.0037");
    const totalCost = BigInt(finalQty) * mintPrice;
    const recipient = message.action.interactor.verifications.filter((v) => v.startsWith("0x"))[0];

    if (!recipient) {
      return json(
        {
          message: "Connect a wallet to Farcaster to mint.",
        },
        {
          status: 400,
        }
      );
    }

    const address = process.env.CONTRACT_ADDRESS!;
    const tx = {
      address: address as `0x${string}`,
      abi: claimAbi,
      functionName: "mintBatch",
      args: [
        process.env.CREATOR_CONTRACT_ADDRESS as `0x${string}`,
        BigInt(process.env.INSTANCE_ID!),
        finalQty,
        [],
        [],
        message.action.interactor.verifications[0] as `0x${string}`,
      ],
      value: totalCost,
    } as const;

    const chain = base.id;

    if (process.env.NODE_ENV === "development") {
      const client = clientsByChainId[base.id];
      await client.simulateContract(tx).catch(console.error);
    }

    const txData = {
      chainId: `eip155:${chain}`,
      method: `eth_sendTransaction`,
      params: {
        abi: manifoldAbi,
        to: address,
        data: encodeFunctionData({
          ...tx,
        }),
        value: totalCost,
      },
    };

    return typedjson(txData);
  } catch (e) {
    console.error(e);
    return json(
      {
        message: "An error occurred while minting. Please try again later.",
      },
      {
        status: 500,
      }
    );
  }
}
