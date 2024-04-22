# Shibuya Chapter 5

![Shibuya Puzzle](https://wowow.shibuya.xyz/images/progress.jpg)

A farcaster exclusive onframe game to to celebrate the launch of White Rabbit, Chapter 5 by [shibuya.xyz](https://shibuya.xyz).

- Launched 04/18
- Made by [@jtgi](https://warpcast.com/jtgi) and [@pppleasr](https:/warpcast.com/pplpleasr)

## Summary

Chapter 5 is an onframe game, the rules are as follows:

- The answer image is made up of 200 tiles.
- You can reveal a tile by minting a token.
- The tile to reveal will be chosen at random based on the token id.
- The artwork revealing the seed phrase is only viewable on Farcaster via a frame. Onchain it is a placeholder image.
- You may only view others tiles if you follow them.

## Points of interest

### How do you generate the global progress dynamically with frames?

High level:

- Divide up the image into 200 slices, rows and columns. Each tile can be referenced by its [x, y] coordinates.
- Fetch the tokens minted and map each token id onto a tile. Compute the x coordinate by division and the y by modulo.
- For each [x, y] coordinate find the prepared tile image slice and compose it with sharp.
- Write the file to disk

See `/lib/puzzle.server.ts` for source.

### How do you generate each player's collected images?

The same as global progress but only fetch tokens for the cast author's connected addresses instead of all tokens. You can acquire their addresses from the frame validation response from neynar. With simplehash's great nft api you can resolve tokens collected across many addresses in a single api call.

See `/lib/puzzle.server.ts` for source.

### How do you require only followers can see?

This is easy with neynar's apis. When you validate a frame message, you can include a `follow_context` parameter and it will return whether or not the cast author and cast interactor follow each other.

## Stack

- [remix.run](https://remix.run) – Framework. Not necessary here tbh, but I'm fast with it. Remix is a nice choice if you might need a web app with admin screen and don't want to fuss with builds. Since this ended up being pure frames, frames.js or frog.fm would have been more appropriate.
- [neynar](https://neynar.com) - Farcaster Data. fully typed sdks and rest apis for most things you need. Used here to validate frame payloads and get farcaster user information.
- [simplehash](https://simplehash.com) - Token Data. Nice nft data apis, includes bulk fetch by contract + wallet address endpoints. Great for farcaster accounts that have multiple connected wallets. Supports more chains than anyone else and niche apis like 1155 token owners.
- [Manifold](https://studio.manifold.xyz) - NFT Contracts. All the drop controls, allowing only 5 tokens per wallet, being able to update art managed through manifold studio and deployed on base.
- [fly](https://fly.io) - Hosting. Deployed with a single box and tons of ram for ondemand image generation. Gives access to a file system to make it easy to cache files without requiring yet another external provider or network apis.
