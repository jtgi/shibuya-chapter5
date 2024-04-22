# Shibuya Chapter 5

![Shibuya Puzzle](https://wowow.shibuya.xyz/images/progress.jpg)

An farcaster exclusive onframe game to uncover 8/12 words in a seed phrase.
Launched 04/18, Made by [@jtgi](https://warpcast.com/jtgi) and [@pppleasr](https:/warpcast.com/pplpleasr)

## Summary

Chapter 5 is an onframe game, the rules are as follows:

- The answer image is made up of 200 tiles.
- You can reveal a tile by minting a token.
- The tile to reveal will be chosen at random based on the token id.
- The artwork revealing the seed phrase is only viewable on Farcaster via a frame. Onchain it is a placeholder image.
- You may only view others tiles if you follow them.

## Questions of interest

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

- Framework: [remix.run](https://remix.run) (not really necessary tbh but faster for me)
- Farcaster Data: [neynar](https://neynar.com)
- NFT Data: [simplehash](https://simplehash.com)
- Token Contracts: [Manifold](https://studio.manifold.xyz)
# shibuya-chapter5
