"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { openAppeal, reviewAppeal } from "@/lib/genlayer/contracts";
import { APPEAL_REASONS } from "@/lib/constants";
import ContractNotice from "@/components/ui/ContractNotice";

export default function AppealPage() {
  const params = useParams();
  const router = useRouter();
  const roundId = params.roundId as string;
  const proposalId = params.proposalId as string;
  const [reason, setReason] = useState<string>(APPEAL_REASONS[0]);
  const [argumentText, setArgumentText] = useState("");
  const [newEvidence, setNewEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [appealId, setAppealId] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const id = `appeal_${Date.now().toString(36)}`;
      await openAppeal(id, proposalId, JSON.stringify({
        proposalId, reason, argument: argumentText, newEvidence,
        createdAt: Date.now(),
      }));
      setAppealId(id);
      await reviewAppeal(id);
      router.push(`/rounds/${roundId}/proposals/${proposalId}`);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link href={`/rounds/${roundId}/proposals/${proposalId}`} className="tab-button">← Proposal</Link>
      <ContractNotice />
      <div className="dossier-label mt-6">Appeal Chamber</div>
      <h1 className="section-title mt-1">Open Appeal</h1>

      <div className="manuscript-border bg-manuscript/60 p-6 mt-6 space-y-3">
        <label className="block">
          <div className="dossier-label mb-1">Reason</div>
          <select value={reason} onChange={(e)=>setReason(e.target.value)} className="w-full bg-ink/60 border border-graphite p-3 text-ivory text-sm mono">
            {APPEAL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="block">
          <div className="dossier-label mb-1">Why should the decision change?</div>
          <textarea rows={6} value={argumentText} onChange={(e)=>setArgumentText(e.target.value)} className="w-full bg-ink/60 border border-graphite p-3 text-ivory text-sm" />
        </label>
        <label className="block">
          <div className="dossier-label mb-1">New evidence (description / link / CID)</div>
          <textarea rows={3} value={newEvidence} onChange={(e)=>setNewEvidence(e.target.value)} className="w-full bg-ink/60 border border-graphite p-3 text-ivory text-sm" />
        </label>
        {err && <div className="text-carmine text-sm">{err}</div>}
        <button onClick={submit} disabled={busy} className="tab-button border-seal text-seal">
          {busy ? "Opening + Reviewing…" : "OPEN APPEAL & RUN CONSENSUS"}
        </button>
        {appealId && <div className="dossier-label mt-2">Appeal {appealId}</div>}
      </div>
    </div>
  );
}
