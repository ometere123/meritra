"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { submitProposalCommitmentWithId, ContractNotConfiguredError, getRound } from "@/lib/genlayer/contracts";
import { getAccountAddress } from "@/lib/genlayer/client";
import {
  canonicalProposalJson,
  commitmentHash,
  generateSalt,
  savePendingReveal,
  downloadRevealBackup,
  PendingReveal,
} from "@/lib/genlayer/commitReveal";
import ContractNotice from "@/components/ui/ContractNotice";

export default function SubmitProposal() {
  const params = useParams();
  const router = useRouter();
  const roundId = params.roundId as string;
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [round, setRound] = useState<any>(null);
  const [backup, setBackup] = useState<PendingReveal | null>(null);
  const currentWallet = getAccountAddress();
  const isCreator = !!round?.creator && round.creator.toLowerCase() === currentWallet.toLowerCase();
  const now = Math.floor(Date.now() / 1000);
  const canCommit =
    round?.status === "OPEN" &&
    now >= Number(round?.application_start || 0) &&
    now <= Number(round?.application_deadline || 0) &&
    !isCreator;

  const [form, setForm] = useState({
    applicantWallet: currentWallet || "",
    title: "",
    public_summary: "",
    category: "",
    requested_amount: 0,
    currency: "USD",
    abstract: "",
    research_question: "",
    methodology: "",
    timeline: "",
    budget_breakdown: "",
    impact_claims: "",
    ethics_considerations: "",
    applicant_background: "",
    evidence_summary: "",
  });
  const upd = (k: string, v: any) => setForm({ ...form, [k]: v });

  useEffect(() => {
    (async () => { try { setRound(await getRound(roundId)); } catch { /* ignore */ } })();
  }, [roundId]);

  useEffect(() => {
    if (currentWallet && !form.applicantWallet) setForm((f) => ({ ...f, applicantWallet: currentWallet }));
  }, [currentWallet]); // eslint-disable-line

  const canonicalPreview = useMemo(() => canonicalProposalJson({ ...form, applicantWallet: form.applicantWallet }), [form]);

  const commit = async () => {
    setErr(null); setBusy(true);
    try {
      if (!canCommit) throw new Error(isCreator ? "Creator cannot submit to own grant." : "Round is not in commitment phase.");
      if (!form.title.trim()) throw new Error("Title required.");
      if (!form.applicantWallet) throw new Error("Connect a wallet to commit.");

      const salt = generateSalt();
      const canonical = canonicalProposalJson({ ...form });
      const hash = await commitmentHash(canonical, salt);

      const { proposalId } = await submitProposalCommitmentWithId(roundId, hash);

      const pending: PendingReveal = {
        roundId,
        proposalId,
        applicantWallet: form.applicantWallet,
        commitmentHash: hash,
        canonicalJson: canonical,
        salt,
        createdAt: Date.now(),
        preview: {
          title: form.title,
          public_summary: form.public_summary,
          requested_amount: form.requested_amount,
          currency: form.currency,
        },
      };
      savePendingReveal(pending);
      setBackup(pending);
    } catch (e) {
      if (e instanceof ContractNotConfiguredError) setErr("GenLayer contract not configured.");
      else setErr((e as Error).message);
    } finally { setBusy(false); }
  };

  if (backup) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="dossier-label">Sealed Application Committed</div>
        <h1 className="section-title mt-1">Save your reveal data</h1>
        <div className="manuscript-border bg-manuscript/70 p-6 mt-6 space-y-3">
          <p className="text-ivory">
            Your application is now <strong className="text-gold">sealed on-chain</strong>. It is hidden before reveal.
            After the grant creator closes the commitment phase, you must come back and reveal - your application becomes publicly visible for GenLayer consensus review only after a successful reveal.
          </p>
          <div className="manuscript-border bg-ink/40 p-4 mono text-xs space-y-2">
            <div><span className="text-margin">Proposal ID:</span> <span className="text-ivory">{backup.proposalId}</span></div>
            <div><span className="text-margin">Commitment hash:</span> <span className="text-ivory break-all">{backup.commitmentHash}</span></div>
            <div><span className="text-margin">Salt:</span> <span className="text-ivory break-all">{backup.salt}</span></div>
          </div>
          <div className="manuscript-border bg-seal/10 border-seal p-4">
            <div className="dossier-label text-seal">Critical</div>
            <p className="text-ivory text-sm">
              If you lose the salt or your local proposal JSON before reveal, you cannot reveal. Download the backup now and keep it private.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => downloadRevealBackup(backup)} className="seal-tab">Download reveal backup</button>
            <button
              onClick={() => navigator.clipboard.writeText(JSON.stringify(backup, null, 2))}
              className="tab-button"
            >Copy to clipboard</button>
            <Link href={`/reveal`} className="tab-button">Open reveal dashboard</Link>
            <Link href={`/rounds/${roundId}/proposals/${backup.proposalId}`} className="tab-button">View sealed proposal</Link>
          </div>
        </div>
      </div>
    );
  }

  const sections = ["Identity", "Summary", "Funding", "Research", "Evidence", "Review"];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="dossier-label">Sealed Application - Commit Phase</div>
      <h1 className="section-title mt-1">Submit Sealed Research Proposal</h1>
      <ContractNotice />
      <div className="manuscript-border bg-manuscript/40 p-4 mt-4 text-margin text-sm">
        Meritra uses a commit-reveal protocol. You commit a hash now; your application is hidden before reveal. After the
        commitment phase closes you reveal the same JSON + salt, the contract verifies the hash, and your proposal becomes
        publicly visible for GenLayer consensus review.
      </div>
      {!canCommit && (
        <div className="manuscript-border bg-manuscript/50 p-4 mt-4 text-margin text-sm">
          {isCreator
            ? "You created this grant and cannot submit to it."
            : round?.status && round.status !== "OPEN"
              ? `Round status is ${round.status}. Commitments are only accepted while the round is OPEN.`
              : "This round is not in its commitment window."}
        </div>
      )}
      <div className="flex gap-1 mt-8 flex-wrap">
        {sections.map((s, i) => (
          <button key={s} onClick={() => setStep(i + 1)} className={`tab-button text-[10px] ${step === i + 1 ? "bg-gold/10 border-gold text-gold" : ""}`}>
            {String(i + 1).padStart(2, "0")} {s}
          </button>
        ))}
      </div>
      <div className="manuscript-border bg-manuscript/60 p-6 mt-6 space-y-4">
        {step === 1 && <>
          <F label="Applicant Wallet" v={form.applicantWallet} on={(v) => upd("applicantWallet", v)} mono />
          <F label="Proposal Title" v={form.title} on={(v) => upd("title", v)} />
        </>}
        {step === 2 && <>
          <F label="Public Summary" v={form.public_summary} on={(v) => upd("public_summary", v)} textarea />
          <F label="Category" v={form.category} on={(v) => upd("category", v)} />
        </>}
        {step === 3 && <div className="grid grid-cols-2 gap-3">
          <F label="Requested Amount" v={form.requested_amount} on={(v) => upd("requested_amount", Number(v))} type="number" />
          <F label="Currency" v={form.currency} on={(v) => upd("currency", v)} />
        </div>}
        {step === 4 && <>
          <F label="Abstract" v={form.abstract} on={(v) => upd("abstract", v)} textarea />
          <F label="Research Question" v={form.research_question} on={(v) => upd("research_question", v)} textarea />
          <F label="Methodology" v={form.methodology} on={(v) => upd("methodology", v)} textarea />
          <F label="Timeline" v={form.timeline} on={(v) => upd("timeline", v)} textarea />
          <F label="Budget Breakdown" v={form.budget_breakdown} on={(v) => upd("budget_breakdown", v)} textarea />
          <F label="Impact Claims" v={form.impact_claims} on={(v) => upd("impact_claims", v)} textarea />
          <F label="Ethics Considerations" v={form.ethics_considerations} on={(v) => upd("ethics_considerations", v)} textarea />
          <F label="Applicant Background" v={form.applicant_background} on={(v) => upd("applicant_background", v)} textarea />
        </>}
        {step === 5 && <F label="Evidence Summary" v={form.evidence_summary} on={(v) => upd("evidence_summary", v)} textarea />}
        {step === 6 && <div>
          <div className="dossier-label mb-2">Canonical JSON to be hashed</div>
          <pre className="text-xs text-margin overflow-auto max-h-60 bg-ink/40 p-3 mono">{canonicalPreview}</pre>
          <div className="dossier-label mt-3">What happens next</div>
          <ul className="text-ivory/80 text-sm list-disc list-inside space-y-1">
            <li>Salt is generated locally in your browser.</li>
            <li>Commitment hash = sha256(canonical_json + salt).</li>
            <li>Only the hash goes on-chain. Your content is hidden before reveal.</li>
            <li>You must keep the reveal backup safe until the reveal phase.</li>
          </ul>
          {err && <div className="text-carmine text-sm mt-2">{err}</div>}
          <button onClick={commit} disabled={busy || !canCommit} className="seal-tab mt-4">
            {busy ? "Sealing commitment..." : "Submit Sealed Commitment"}
          </button>
        </div>}
      </div>
      <div className="flex justify-between mt-6">
        <button onClick={() => setStep(Math.max(1, step - 1))} className="tab-button">Previous</button>
        <button onClick={() => setStep(Math.min(6, step + 1))} className="tab-button">Next</button>
      </div>
    </div>
  );
}

type FieldProps = { label: string; v: string | number; on: (value: string) => void; textarea?: boolean; type?: string; mono?: boolean; };
function F({ label, v, on, textarea, type, mono }: FieldProps) {
  return (
    <label className="block">
      <div className="dossier-label mb-1">{label}</div>
      {textarea
        ? <textarea rows={5} value={v} onChange={(e) => on(e.target.value)} className="w-full bg-ink/60 border border-graphite p-3 text-ivory text-sm" />
        : <input type={type || "text"} value={v} onChange={(e) => on(e.target.value)} className={`w-full bg-ink/60 border border-graphite p-3 text-ivory text-sm ${mono ? "mono" : ""}`} />}
    </label>
  );
}
