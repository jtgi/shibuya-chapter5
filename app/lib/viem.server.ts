import { createPublicClient, http } from "viem";
import { arbitrum, base, mainnet, optimism, sepolia } from "viem/chains";

const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(`https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`),
});

const optimismClient = createPublicClient({
  chain: optimism,
  transport: http(`https://optimism-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`),
});

const baseClient = createPublicClient({
  chain: base,
  transport: http(`https://api.developer.coinbase.com/rpc/v1/base/${process.env.BASE_PROJEcT_ID}`),
});

const arbitrumClient = createPublicClient({
  chain: arbitrum,
  transport: http(`https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`),
});

const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http(`https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`),
});

export const clientsByChainId = {
  [String(mainnet.id)]: mainnetClient,
  [String(optimism.id)]: optimismClient,
  [String(base.id)]: baseClient,
  [String(arbitrum.id)]: arbitrumClient,
  [String(sepolia.id)]: sepoliaClient,
};

export const chainByChainId = {
  [String(mainnet.id)]: mainnet,
  [String(optimism.id)]: optimism,
  [String(base.id)]: base,
  [String(arbitrum.id)]: arbitrum,
  [String(sepolia.id)]: sepolia,
};
