"use client";

import { useEffect, useState } from "react";
import {
  getEmbeddedConnectedWallet,
  useCreateWallet,
  useExportWallet,
  usePrivy,
  useWallets,
} from "@privy-io/react-auth";
import { setPrivyEmbeddedWallet } from "@/lib/genlayer/client";

export function MeritraAuth() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const { exportWallet } = useExportWallet();
  const [creatingWallet, setCreatingWallet] = useState(false);
  const embeddedWallet = getEmbeddedConnectedWallet(wallets);

  useEffect(() => {
    if (!ready || !walletsReady || !authenticated) {
      setPrivyEmbeddedWallet(null);
      return;
    }

    if (embeddedWallet) {
      setPrivyEmbeddedWallet(embeddedWallet);
      return;
    }

    if (creatingWallet) return;

    setCreatingWallet(true);
    createWallet()
      .catch((error) => console.error("Unable to create Privy embedded wallet", error))
      .finally(() => setCreatingWallet(false));
  }, [authenticated, createWallet, creatingWallet, embeddedWallet, ready, walletsReady]);

  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return <div className="hidden text-xs text-carmine md:block">Set NEXT_PUBLIC_PRIVY_APP_ID.</div>;
  }

  if (!ready) {
    return <button className="seal-tab text-xs opacity-70">Loading...</button>;
  }

  if (!authenticated) {
    return (
      <button onClick={() => login({ loginMethods: ["email", "google"] })} className="seal-tab text-xs">
        Sign In
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:block text-right">
        <div className="dossier-label">Signed In</div>
        <div className="mono text-[10px] text-margin">
          {embeddedWallet?.address
            ? shortAddress(embeddedWallet.address)
            : creatingWallet
              ? "Creating wallet..."
              : user?.email?.address || "Privy user"}
        </div>
      </div>
      {embeddedWallet && (
        <button
          type="button"
          onClick={() => exportWallet({ address: embeddedWallet.address })}
          className="tab-button text-[10px]"
        >
          Export Key
        </button>
      )}
      <button type="button" onClick={logout} className="tab-button text-[10px]">
        Sign Out
      </button>
    </div>
  );
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
