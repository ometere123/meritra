"use client";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { GENLAYER_STUDIONET, CONTRACT_ADDRESS } from "./config";

type PrivyEmbeddedWallet = {
  address: string;
  getEthereumProvider: () => Promise<{
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  }>;
};

let _readClient: ReturnType<typeof createClient> | null = null;
let _writeClient: ReturnType<typeof createClient> | null = null;
let _wallet: PrivyEmbeddedWallet | null = null;

function genlayerChain() {
  return {
    ...studionet,
    id: GENLAYER_STUDIONET.chainId,
    name: GENLAYER_STUDIONET.name,
    rpcUrls: {
      default: { http: [GENLAYER_STUDIONET.rpcUrl] },
      public: { http: [GENLAYER_STUDIONET.rpcUrl] },
    },
  } as any;
}

export function setPrivyEmbeddedWallet(wallet: PrivyEmbeddedWallet | null) {
  _wallet = wallet;
  _writeClient = null;
}

export function getReadClient() {
  if (_readClient) return _readClient;

  _readClient = createClient({
    chain: genlayerChain(),
    endpoint: GENLAYER_STUDIONET.rpcUrl,
  });

  return _readClient;
}

export async function getWriteClient() {
  if (!_wallet) {
    throw new Error("Sign in to Meritra before submitting GenLayer contract actions.");
  }
  if (_writeClient) return _writeClient;

  const provider = await _wallet.getEthereumProvider();
  _writeClient = createClient({
    chain: genlayerChain(),
    endpoint: GENLAYER_STUDIONET.rpcUrl,
    account: _wallet.address as `0x${string}`,
    provider: provider as any,
  });

  return _writeClient;
}

export function getAccountAddress(): string {
  return _wallet?.address || "";
}

export function getContractAddress() {
  return CONTRACT_ADDRESS as `0x${string}`;
}
