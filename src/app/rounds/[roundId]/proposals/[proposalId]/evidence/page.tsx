"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { addEvidence, getProposalEvidence } from "@/lib/genlayer/contracts";
import { EVIDENCE_TYPES } from "@/lib/constants";
import ContractNotice from "@/components/ui/ContractNotice";

export default function EvidencePage() {
  const params = useParams();
  const roundId = params.roundId as string;
  const proposalId = params.proposalId as string;
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "PROPOSAL_DOCUMENT",
    title: "",
    description: "",
    uri: "",
    hash: "",
    source: "",
    date: "",
    relevanceNote: "",
    privacy: "PUBLIC",
  });

  const load = async () => setItems(await getProposalEvidence(proposalId));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [proposalId]);

  const submit = async () => {
    setErr(null); setBusy(true);
    try {
      const id = `evidence_${Date.now().toString(36)}`;
      await addEvidence(id, proposalId, JSON.stringify({ ...form, proposalId }));
      setForm({ ...form, title: "", description: "", uri: "", hash: "", source: "", relevanceNote: "" });
      await load();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <Link href={`/rounds/${roundId}/proposals/${proposalId}`} className="tab-button">← Proposal</Link>
      <ContractNotice />
      <div className="dossier-label mt-6">Evidence Archive</div>
      <h1 className="section-title mt-1">Attach Evidence</h1>

      <div className="manuscript-border bg-manuscript/60 p-6 mt-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Type" value={form.type} options={EVIDENCE_TYPES as any} onChange={(v: string)=>setForm({...form, type:v})} />
          <Select label="Privacy" value={form.privacy} options={["PUBLIC","REDACTED","PRIVATE_HASH_ONLY"]} onChange={(v: string)=>setForm({...form, privacy:v})} />
        </div>
        <F label="Title" v={form.title} on={(v: string)=>setForm({...form, title:v})} />
        <F label="Description" v={form.description} on={(v: string)=>setForm({...form, description:v})} textarea />
        <F label="URI / IPFS CID / Link" v={form.uri} on={(v: string)=>setForm({...form, uri:v})} mono />
        <div className="grid grid-cols-3 gap-3">
          <F label="Hash" v={form.hash} on={(v: string)=>setForm({...form, hash:v})} mono />
          <F label="Source" v={form.source} on={(v: string)=>setForm({...form, source:v})} />
          <F label="Date" v={form.date} on={(v: string)=>setForm({...form, date:v})} type="date" />
        </div>
        <F label="Relevance to Rubric" v={form.relevanceNote} on={(v: string)=>setForm({...form, relevanceNote:v})} textarea />
        {err && <div className="text-carmine text-sm">{err}</div>}
        <button onClick={submit} disabled={busy} className="seal-tab">{busy ? "Filing…" : "◈ File Evidence"}</button>
      </div>

      <div className="dossier-label mt-10">Archived</div>
      <div className="space-y-2 mt-2">
        {items.length === 0 ? <div className="text-margin text-sm">No evidence yet.</div> :
          items.map((ev: any) => (
            <div key={ev.id} className="manuscript-border bg-ink/40 p-3">
              <div className="flex justify-between">
                <span className="mono text-gold text-xs">{ev.type}</span>
                <span className="mono text-[10px] text-margin">{ev.privacy}</span>
              </div>
              <div className="heading text-ivory">{ev.title}</div>
              <p className="text-margin text-xs">{ev.description}</p>
            </div>
          ))}
      </div>
    </div>
  );
}

function F({ label, v, on, textarea, type, mono }: any) {
  return (
    <label className="block">
      <div className="dossier-label mb-1">{label}</div>
      {textarea
        ? <textarea rows={3} value={v} onChange={(e)=>on(e.target.value)} className="w-full bg-ink/60 border border-graphite p-3 text-ivory text-sm" />
        : <input type={type||"text"} value={v} onChange={(e)=>on(e.target.value)} className={`w-full bg-ink/60 border border-graphite p-3 text-ivory text-sm ${mono?"mono":""}`} />}
    </label>
  );
}

function Select({ label, value, options, onChange }: any) {
  return (
    <label className="block">
      <div className="dossier-label mb-1">{label}</div>
      <select value={value} onChange={(e)=>onChange(e.target.value)} className="w-full bg-ink/60 border border-graphite p-3 text-ivory text-sm mono">
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
