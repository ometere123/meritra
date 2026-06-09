export const GENLAYER_STUDIONET = {
  name: "GenLayer Studionet",
  chainId: 61999,
  rpcUrl: "https://studio.genlayer.com/api",
  currency: "GEN",
  explorerUrl: "https://explorer-studio.genlayer.com",
};

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS || "0xDD59f0820726Dd961C1E3BEF9A04aE76bb9B4586";

export const isContractConfigured = (): boolean =>
  !!CONTRACT_ADDRESS && CONTRACT_ADDRESS.length > 0;

export const explorerTxUrl = (tx: string) =>
  `${GENLAYER_STUDIONET.explorerUrl}/tx/${tx}`;

export const explorerAddressUrl = (addr: string) =>
  `${GENLAYER_STUDIONET.explorerUrl}/address/${addr}`;
