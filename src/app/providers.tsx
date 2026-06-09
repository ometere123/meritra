"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { GENLAYER_STUDIONET } from "@/lib/genlayer/config";

const genlayerChain = {
  id: GENLAYER_STUDIONET.chainId,
  name: GENLAYER_STUDIONET.name,
  nativeCurrency: {
    name: GENLAYER_STUDIONET.currency,
    symbol: GENLAYER_STUDIONET.currency,
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [GENLAYER_STUDIONET.rpcUrl] },
    public: { http: [GENLAYER_STUDIONET.rpcUrl] },
  },
};

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) return <>{children}</>;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "google"],
        appearance: {
          theme: "dark",
          accentColor: "#c8a96a",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
          showWalletUIs: false,
        },
        defaultChain: genlayerChain,
        supportedChains: [genlayerChain],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
