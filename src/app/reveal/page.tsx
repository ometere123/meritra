"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listPendingReveals,
  removePendingReveal,
  downloadRevealBackup,
  PendingReveal,
} from "@/lib/genlayer/commitReveal";
import { revealProposal, getProposal, getRound, ContractNotConfiguredError } from "@/lib/genlayer/contracts";
import { getAccountAddress } from "@/lib/genlayer/client";
import ContractNotice from "@/components/ui/ContractNotice";

type Status = "pending" | "revealing" | "revealed" | "error";

export default function RevealDashboard() {
  const [wallet, setWallet] = useState<string>("");
  const [items, setItems] = useState<PendingReveal[]>([]);
  const [statuses, setStatuses] = useState<Record<string, { s: Status; msg?: string; roundStatus?: string }>>({});

  const load = async () => {
    const w = getAccountAddress();
    setWallet(w);
    const list = listPendingReveals(w || undefined);
    setItems(list);
    const next: typeof statuses = {};
    for (const it of list) {
      try {
        const [p, r] = await Promise.all([getProposal(it.proposalId), getRound(it.roundId)]);
        if (p?.revealed) next[it.proposalId] = { s: "revealed", roundStatus: r?.status };
        else next[it.proposalId] = { s: "pending", roundStatus: r?.status };
      } catch {
        next[it.proposalId] = { s: "pending" };
      }
    }
    setStatuses(next);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const reveal = async (it: PendingReveal) => {
    setStatuses((s) => ({ ...s, [it.proposalId]: { s: "revealing" } }));
    try {
      // Reconstruct the canonical JSON object the contract will hash. We send
      // the same canonical_json string we used to commit, plus the salt.
      const parsed = JSON.parse(it.canonicalJson);
      await revealProposal(it.proposalId, JSON.stringify(parsed), it.salt);
      setStatuses((s) => ({ ...s, [it.proposalId]: { s: "revealed" } }));
    } catch (e) {
      const msg = e instanceof ContractNotConfiguredError ? "Contract not configured." : (e as Error).message;
      setStatuses((s) => ({ ...s, [it.proposalId]: { s: "error", msg } }));
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="dossier-label">Reveal Dashboard</div>
      <h1 className="section-title mt-1">Your Sealed Applications</h1>
      <ContractNotice />
      <div className="manuscript-border bg-manuscript/40 p-4 mt-4 text-margin text-sm">
        These commit-reveal protected applications are stored only on this device. Reveal becomes possible after the grant
        creator closes the commitment phase (round status REVEAL_PHASE). After reveal, the proposal is publicly visible for
        GenLayer consensus review.
      </div>
      {!wallet && (
        <div className="manuscript-border bg-seal/10 border-seal p-4 mt-6 text-ivory text-sm">
          Connect your wallet to see reveals tied to your address. Reveals shown below are filtered by the wallet currently connected.
        </div>
      )}
      <div className="mt-8 space-y-3">
        {items.length === 0 && (
          <div className="manuscript-border bg-manuscript/40 p-6 text-margin text-sm text-center">
            No pending sealed applications on this device. Submit a sealed proposal from an open round to populate this dashboard.
          </div>
        )}
        {items.map((it) => {
          const st = statuses[it.proposalId] || { s: "pending" as Status };
          const canReveal = st.roundStatus === "REVEAL_PHASE" || st.roundStatus === "CLOSED";
          return (
            <div key={it.proposalId} className="manuscript-border bg-ink/40 p-4">
              <div className="flex justify-between flex-wrap gap-3">
                <div>
                  <div className="mono text-xs text-margin">{it.proposalId} · round {it.roundId}</div>
                  <div className="heading text-ivory text-lg mt-1">{it.preview.title || "Untitled sealed application"}</div>
                  <div className="text-margin text-xs mt-1">
                    Committed {new Date(it.createdAt).toLocaleString()} · Requested {it.preview.requested_amount} {it.preview.currency}
                  </div>
                </div>
                <div className="text-right">
                  <div className="score-pill">
                    {st.s === "revealed" ? "REVEALED" : st.s === "revealing" ? "REVEALING…" : st.s === "error" ? "ERROR" : "SEALED"}
                  </div>
                  <div className="mono text-[10px] text-margin mt-1">round: {st.roundStatus || "-"}</div>
                </div>
              </div>
              <div className="mono text-[10px] text-margin mt-3 break-all">commit: {it.commitmentHash}</div>
              {st.s === "error" && <div className="text-carmine text-xs mt-2">{st.msg}</div>}
              <div className="flex gap-2 flex-wrap mt-3">
                {st.s !== "revealed" && canReveal && (
                  <button onClick={() => reveal(it)} disabled={st.s === "revealing"} className="seal-tab text-xs">
                    {st.s === "revealing" ? "Revealing…" : "Reveal proposal"}
                  </button>
                )}
                {st.s !== "revealed" && !canReveal && (
                  <span className="tab-button text-[10px] opacity-70">Reveal opens after creator closes commitments</span>
                )}
                <button onClick={() => downloadRevealBackup(it)} className="tab-button text-xs">Download backup</button>
                <Link href={`/rounds/${it.roundId}/proposals/${it.proposalId}`} className="tab-button text-xs">View proposal</Link>
                {st.s === "revealed" && (
                  <button
                    onClick={() => { removePendingReveal(it.proposalId); load(); }}
                    className="tab-button text-xs"
                  >Clear local copy</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
