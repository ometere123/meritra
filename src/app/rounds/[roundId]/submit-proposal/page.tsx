"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { submitProposalWithId, ContractNotConfiguredError, getRound } from "@/lib/genlayer/contracts";
import { getAccountAddress } from "@/lib/genlayer/client";
import ContractNotice from "@/components/ui/ContractNotice";

export default function SubmitProposal() {
  const params = useParams();
  const router = useRouter();
  const roundId = params.roundId as string;
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [round, setRound] = useState<any>(null);
  const currentWallet = getAccountAddress();
  const isCreator = !!round?.createdByWallet && round.createdByWallet === currentWallet;
  const now = Math.floor(Date.now() / 1000);
  const canSubmit = round?.status === "OPEN" && now >= Number(round?.application_start || 0) && now <= Number(round?.application_deadline || 0) && !isCreator;

  const [form, setForm] = useState({
    applicantWallet: typeof window !== "undefined" ? getAccountAddress() : "",
    title: "",
    public_summary: "",
    category: "",
    requested_amount: 0,
    currency: "USD",
    content_hash: "",
    content_cid: "",
    evidence_summary: "",
  });
  const upd = (k: string, v: any) => setForm({ ...form, [k]: v });

  useEffect(() => {
    (async () => { try { setRound(await getRound(roundId)); } catch { /* ignore */ } })();
  }, [roundId]);

  const submit = async () => {
    setErr(null); setBusy(true);
    try {
      if (!canSubmit) throw new Error(isCreator ? "Creator cannot submit to own grant." : "Round is not accepting submissions.");
      const payload = {
        title: form.title,
        public_summary: form.public_summary,
        category: form.category,
        requested_amount: form.requested_amount,
        currency: form.currency,
        content_hash: form.content_hash,
        content_cid: form.content_cid,
        evidence_summary: form.evidence_summary,
      };
      const { proposalId } = await submitProposalWithId(roundId, JSON.stringify(payload));
      router.push(`/rounds/${roundId}/proposals/${proposalId}`);
    } catch (e) {
      if (e instanceof ContractNotConfiguredError) setErr("GenLayer contract not configured.");
      else setErr((e as Error).message);
    } finally { setBusy(false); }
  };

  const sections = ["Identity", "Summary", "Category", "Funding", "Evidence", "Review"];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="dossier-label">Proposal Dossier Wizard</div>
      <h1 className="section-title mt-1">Submit Research Proposal</h1>
      <ContractNotice />
      {!canSubmit && <div className="manuscript-border bg-manuscript/50 p-4 mt-4 text-margin text-sm">{isCreator ? "You created this grant and cannot submit to it." : "This round is not open for submissions yet."}</div>}
      <div className="flex gap-1 mt-8 flex-wrap">{sections.map((s, i) => <button key={s} onClick={() => setStep(i + 1)} className={`tab-button text-[10px] ${step === i + 1 ? "bg-gold/10 border-gold text-gold" : ""}`}>{String(i + 1).padStart(2, "0")} {s}</button>)}</div>
      <div className="manuscript-border bg-manuscript/60 p-6 mt-6 space-y-4">
        {step === 1 && <>
          <F label="Applicant Wallet" v={form.applicantWallet} on={(v) => upd("applicantWallet", v)} mono />
          <F label="Proposal Title" v={form.title} on={(v) => upd("title", v)} />
        </>}
        {step === 2 && <>
          <F label="Public Summary" v={form.public_summary} on={(v) => upd("public_summary", v)} textarea />
          <F label="Category" v={form.category} on={(v) => upd("category", v)} />
        </>}
        {step === 3 && <>
          <div className="grid grid-cols-2 gap-3">
            <F label="Requested Amount" v={form.requested_amount} on={(v) => upd("requested_amount", Number(v))} type="number" />
            <F label="Currency" v={form.currency} on={(v) => upd("currency", v)} />
          </div>
        </>}
        {step === 4 && <>
          <F label="Content Hash" v={form.content_hash} on={(v) => upd("content_hash", v)} mono />
          <F label="Content CID" v={form.content_cid} on={(v) => upd("content_cid", v)} mono />
        </>}
        {step === 5 && <F label="Evidence Summary" v={form.evidence_summary} on={(v) => upd("evidence_summary", v)} textarea />}
        {step === 6 && <div>
          <div className="dossier-label mb-2">Review and Submit</div>
          <pre className="text-xs text-margin overflow-auto max-h-80 bg-ink/40 p-3 mono">{JSON.stringify({ roundId, form }, null, 2)}</pre>
          {err && <div className="text-carmine text-sm mt-2">{err}</div>}
          <button onClick={submit} disabled={busy || !canSubmit} className="seal-tab mt-4">{busy ? "Submitting..." : "Submit Proposal"}</button>
        </div>}
      </div>
      <div className="flex justify-between mt-6"><button onClick={() => setStep(Math.max(1, step - 1))} className="tab-button">Previous</button><button onClick={() => setStep(Math.min(6, step + 1))} className="tab-button">Next</button></div>
    </div>
  );
}

type FieldProps = { label: string; v: string | number; on: (value: string) => void; textarea?: boolean; type?: string; mono?: boolean; };
function F({ label, v, on, textarea, type, mono }: FieldProps) {
  return <label className="block"><div className="dossier-label mb-1">{label}</div>{textarea ? <textarea rows={5} value={v} onChange={(e) => on(e.target.value)} className="w-full bg-ink/60 border border-graphite p-3 text-ivory text-sm" /> : <input type={type || "text"} value={v} onChange={(e) => on(e.target.value)} className={`w-full bg-ink/60 border border-graphite p-3 text-ivory text-sm ${mono ? "mono" : ""}`} />}</label>;
}
