"use client";

import { useEffect, useMemo, useState } from "react";
import { getEmbeddedConnectedWallet, useExportWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { setPrivyEmbeddedWallet } from "@/lib/genlayer/client";

export function AccountMenu() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const { exportWallet } = useExportWallet();
  const [open, setOpen] = useState(false);
  const embeddedWallet = getEmbeddedConnectedWallet(wallets);

  useEffect(() => {
    if (authenticated && walletsReady && embeddedWallet) {
      setPrivyEmbeddedWallet(embeddedWallet);
    } else {
      setPrivyEmbeddedWallet(null);
    }
  }, [authenticated, embeddedWallet, walletsReady]);

  const label = useMemo(() => {
    if (!authenticated) return "Sign In";
    return embeddedWallet?.address ? shortAddress(embeddedWallet.address) : user?.email?.address || "Account";
  }, [authenticated, embeddedWallet?.address, user?.email?.address]);

  if (!ready) return <button className="seal-tab text-xs opacity-70">Loading...</button>;

  if (!authenticated) {
    return (
      <button onClick={() => login({ loginMethods: ["email", "google"] })} className="seal-tab text-xs">
        Sign In
      </button>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="seal-tab text-xs">
        {label}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-graphite bg-ink/95 p-3 shadow-xl z-50">
        <div className="dossier-label">Account</div>
        <div className="text-xs text-margin mt-1">{user?.email?.address || "Signed in with Privy"}</div>
          {embeddedWallet && (
            <button
              type="button"
              className="tab-button w-full mt-3 text-[10px]"
              onClick={async () => {
                await navigator.clipboard.writeText(embeddedWallet.address);
              }}
            >
              Copy Address
            </button>
          )}
          {embeddedWallet && (
            <button
              type="button"
              className="tab-button w-full mt-2 text-[10px]"
              onClick={() => exportWallet({ address: embeddedWallet.address })}
            >
              Export Private Key
            </button>
          )}
          <button type="button" className="tab-button w-full mt-2 text-[10px]" onClick={logout}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
