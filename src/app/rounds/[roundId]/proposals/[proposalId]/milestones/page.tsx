"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { submitMilestone, reviewMilestone, getMilestoneReview } from "@/lib/genlayer/contracts";
import ContractNotice from "@/components/ui/ContractNotice";

export default function MilestonePage() {
  const params = useParams();
  const roundId = params.roundId as string;
  const proposalId = params.proposalId as string;
  const [form, setForm] = useState({
    title: "",
    summary: "",
    deliverables: "",
    proof: "",
    outputLinks: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [review, setReview] = useState<any>(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const id = `milestone_${Date.now().toString(36)}`;
      await submitMilestone(id, proposalId, JSON.stringify({ ...form, proposalId, createdAt: Date.now() }));
      await reviewMilestone(id);
      const r = await getMilestoneReview(id);
      setReview(r);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link href={`/rounds/${roundId}/proposals/${proposalId}`} className="tab-button">← Proposal</Link>
      <ContractNotice />
      <div className="dossier-label mt-6">Milestone Verifier</div>
      <h1 className="section-title mt-1">Submit Milestone Report</h1>

      <div className="manuscript-border bg-manuscript/60 p-6 mt-6 space-y-3">
        <F label="Milestone Title" v={form.title} on={(v: string)=>setForm({...form,title:v})} />
        <F label="Summary of Progress" v={form.summary} on={(v: string)=>setForm({...form,summary:v})} textarea />
        <F label="Accepted / Completed Deliverables" v={form.deliverables} on={(v: string)=>setForm({...form,deliverables:v})} textarea />
        <F label="Proof of Work" v={form.proof} on={(v: string)=>setForm({...form,proof:v})} textarea />
        <F label="Research Output Links" v={form.outputLinks} on={(v: string)=>setForm({...form,outputLinks:v})} textarea />
        {err && <div className="text-carmine text-sm">{err}</div>}
        <button onClick={submit} disabled={busy} className="seal-tab">
          {busy ? "Submitting + Reviewing…" : "◈ Submit & Run Consensus Review"}
        </button>
      </div>

      {review && (
        <div className="manuscript-border bg-manuscript/70 p-6 mt-6 space-y-3">
          <div className="decision-seal text-center">
            <div className="dossier-label">Milestone Decision</div>
            <div className="heading text-gold text-2xl mt-1">{review.milestone_decision?.replaceAll("_"," ")}</div>
            <div className="mono text-sm text-ivory mt-2">
              Delivery {review.delivery_score} · Confidence {review.confidence}% · Tranche release: {String(review.release_next_tranche)}
            </div>
          </div>
          <Block title="Accepted Deliverables" items={review.accepted_deliverables} />
          <Block title="Missing Deliverables" items={review.missing_deliverables} />
          <Block title="Quality Concerns" items={review.quality_concerns} />
          <div>
            <div className="dossier-label">Reasoning</div>
            <p className="text-ivory/85">{review.reasoning_summary}</p>
            <div className="dossier-label mt-2">Recommended Action</div>
            <p className="text-ivory/85">{review.recommended_action}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function F({ label, v, on, textarea }: any) {
  return (
    <label className="block">
      <div className="dossier-label mb-1">{label}</div>
      {textarea
        ? <textarea rows={4} value={v} onChange={(e)=>on(e.target.value)} className="w-full bg-ink/60 border border-graphite p-3 text-ivory text-sm" />
        : <input value={v} onChange={(e)=>on(e.target.value)} className="w-full bg-ink/60 border border-graphite p-3 text-ivory text-sm" />}
    </label>
  );
}

function Block({ title, items }: any) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="dossier-label">{title}</div>
      <ul className="list-disc list-inside text-ivory/85 text-sm mt-1">
        {items.map((x: string, i: number) => <li key={i}>{x}</li>)}
      </ul>
    </div>
  );
}
