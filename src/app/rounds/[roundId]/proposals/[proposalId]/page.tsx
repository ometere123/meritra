"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getProposal, getProposalEvidence, getProposalReview, reviewProposal } from "@/lib/genlayer/contracts";
import ContractNotice from "@/components/ui/ContractNotice";
import { getAccountAddress } from "@/lib/genlayer/client";

export default function ProposalDetail() {
  const params = useParams();
  const roundId = params.roundId as string;
  const proposalId = params.proposalId as string;
  const [proposal, setProposal] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const currentWallet = getAccountAddress();
  const isOwner = !!proposal?.applicantWallet && proposal.applicantWallet === currentWallet;

  const load = async () => {
    setLoading(true);
    try {
      const [p, e, r] = await Promise.all([getProposal(proposalId), getProposalEvidence(proposalId), getProposalReview(proposalId)]);
      setProposal(p);
      setEvidence(e);
      setReview(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [proposalId]);

  const runReview = async () => {
    setBusy(true);
    setErr(null);
    try {
      await reviewProposal(proposalId);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-6 py-12 text-margin">Loading proposal...</div>;
  if (!proposal) return <div className="max-w-7xl mx-auto px-6 py-12"><ContractNotice /><div className="manuscript-border p-8">Proposal not found.</div></div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <ContractNotice />
      <Link href={`/rounds/${roundId}`} className="tab-button">Back to round</Link>

      <div className="manuscript-border bg-manuscript/70 p-6 mt-4">
        <div className="grid md:grid-cols-6 gap-4">
          <Meta label="Proposal ID" value={proposalId} mono />
          <Meta label="Round" value={roundId} mono />
          <Meta label="Applicant" value={isOwner ? proposal.applicantNameOrOrg : "Private"} />
          <Meta label="Wallet" value={isOwner ? (proposal.applicantWallet || "").slice(0, 12) + "..." : "Hidden"} mono />
          <Meta label="Requested" value={isOwner ? `${proposal.requestedAmount || 0} ${proposal.currency || ""}` : "Hidden"} />
          <Meta label="Status" value={proposal.status} accent />
        </div>
        <h1 className="heading text-ivory text-3xl mt-4">{proposal.researchTitle || "Private proposal"}</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 paper p-8 space-y-4">
          <h2 className="heading text-2xl">Abstract</h2>
          <p className="text-sm whitespace-pre-wrap">{isOwner ? proposal.abstract : proposal.publicSummary || "Summary hidden."}</p>
          {isOwner && (
            <>
              <Subsection title="Research Question" body={proposal.researchQuestion} />
              <Subsection title="Problem Statement" body={proposal.problemStatement} />
              <Subsection title="Literature / Context" body={proposal.literatureContext} />
              <Subsection title="Methodology" body={proposal.methodology} />
              <Subsection title="Timeline" body={proposal.timeline} />
              <Subsection title="Budget Breakdown" body={proposal.budgetBreakdown} />
              <Subsection title="Milestones" body={proposal.milestones} />
              <Subsection title="Expected Impact" body={proposal.impactClaims} />
              <Subsection title="Ethics" body={proposal.ethicsConsiderations} />
              <Subsection title="Applicant Background" body={proposal.applicantBackground} />
              <Subsection title="Prior Work" body={proposal.priorWork} />
            </>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <div className="dossier-label">Evidence Archive</div>
              <h2 className="heading text-ivory text-xl">Archive</h2>
            </div>
            {isOwner && <Link href={`/rounds/${roundId}/proposals/${proposalId}/evidence`} className="tab-button text-[10px]">+ Add</Link>}
          </div>
          {evidence.length === 0 ? (
            <div className="manuscript-border p-4 text-margin text-sm">No evidence attached yet.</div>
          ) : evidence.map((ev: any) => (
            <div key={ev.id} className="manuscript-border bg-ink/40 p-3">
              <div className="flex justify-between">
                <span className="mono text-xs text-gold">{ev.type}</span>
                <span className="mono text-[10px] text-margin">{isOwner ? ev.privacy : "REDACTED"}</span>
              </div>
              <div className="heading text-ivory mt-1">{isOwner ? ev.title : "Private evidence"}</div>
              <p className="text-margin text-xs mt-1">{isOwner ? ev.description : "Hidden from current view."}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="mt-10">
        <div className="dossier-label">Generated by GenLayer consensus</div>
        <h2 className="section-title mt-1">GenLayer Consensus Review</h2>
        <p className="text-margin text-sm mt-2">Evidence-supported judgement and non-deterministic grant review.</p>
        {!review ? (
          <div className="manuscript-border bg-manuscript/50 p-8 mt-4 text-center">
            <div className="heading text-ivory text-xl">AWAITING CONSENSUS REVIEW</div>
            <p className="text-margin text-sm mt-1">This proposal has not been reviewed by GenLayer consensus yet.</p>
            {isOwner && <button onClick={runReview} disabled={busy} className="seal-tab mt-6">{busy ? "Running consensus..." : "RUN CONSENSUS REVIEW"}</button>}
            {err && <div className="text-carmine text-sm mt-3">{err}</div>}
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            <div className="decision-seal">
              <div className="dossier-label">Consensus-backed funding recommendation</div>
              <div className="heading text-gold text-4xl mt-2">{review.verdict?.replaceAll("_", " ")}</div>
              <div className="grid md:grid-cols-4 gap-4 mt-4 mono text-sm">
                <Metric label="Funding suitability" value={review.funding_suitability} />
                <Metric label="Merit score" value={review.merit_score} />
                <Metric label="Confidence" value={`${review.confidence}%`} />
                <Metric label="Risk level" value={review.risk_level} />
              </div>
              <div className="grid md:grid-cols-3 gap-4 mt-4 mono text-sm">
                <Metric label="Recommended funding" value={`${review.recommended_funding_amount} ${review.currency}`} />
                <Metric label="Requested funding" value={`${review.requested_amount} ${review.currency}`} />
                <Metric label="Generated by GenLayer consensus" value="Yes" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <ReviewCard title="Evidence strength" sub={review.evidence_strength} />
              <ReviewCard title="Research relevance" sub={review.research_relevance} />
              <ReviewCard title="Originality" sub={{ ...review.originality, reason: isOwner ? `${review.originality?.reason} (plagiarism: ${review.originality?.plagiarism_risk})` : "Sanitised" }} />
              <ReviewCard title="Methodology quality" sub={review.methodology_quality} />
              <ReviewCard title="Feasibility" sub={review.feasibility} />
              <ReviewCard title="Expected impact" sub={review.expected_impact} />
              <ReviewCard title="Budget reasonableness" sub={review.budget_reasonableness} />
              <ReviewCard title="Ethics and risk" sub={review.ethics_and_risk} />
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <Block title="Positive signals" items={isOwner ? review.positive_signals : []} tone="laurel" />
              <Block title="Red flags" items={isOwner ? review.red_flags : []} tone="carmine" />
              <Block title="Missing information" items={isOwner ? review.missing_information : []} tone="margin" />
            </div>

            <div className="manuscript-border bg-manuscript/60 p-5">
              <div className="dossier-label">Reasoning summary</div>
              <p className="text-ivory/85 mt-1">{isOwner ? review.reasoning_summary : "Sanitised consensus explanation only."}</p>
              <div className="dossier-label mt-3">Recommended action</div>
              <p className="text-ivory/85">{isOwner ? review.recommended_action : "Restricted"}</p>
            </div>

            <div className="flex gap-3">
              <Link href={`/rounds/${roundId}/proposals/${proposalId}/appeal`} className="tab-button border-seal text-seal">OPEN APPEAL</Link>
              <Link href={`/rounds/${roundId}/proposals/${proposalId}/milestones`} className="tab-button">MILESTONES</Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Subsection({ title, body }: any) {
  if (!body) return null;
  return <div><h3 className="heading text-xl mt-4">{title}</h3><p className="text-sm whitespace-pre-wrap leading-relaxed">{body}</p></div>;
}
function Meta({ label, value, mono, accent }: any) {
  return <div><div className="dossier-label">{label}</div><div className={`text-sm mt-1 ${mono ? "mono" : ""} ${accent ? "text-gold" : "text-ivory"}`}>{value}</div></div>;
}
function Metric({ label, value }: any) { return <div><span className="text-margin">{label}</span><div className="text-ivory">{value}</div></div>; }
function ReviewCard({ title, sub }: any) { return <div className="manuscript-border bg-ink/40 p-4"><div className="dossier-label">{title}</div><div className="heading text-gold text-2xl mt-1">{sub?.score ?? "—"}</div><p className="text-margin text-xs mt-1">{sub?.reason}</p>{sub?.plagiarism_risk && <div className="mono text-xs text-ivory mt-2">plagiarism risk: {sub.plagiarism_risk}</div>}</div>; }
function Block({ title, items, tone }: any) { const colour = tone === "laurel" ? "text-laurel" : tone === "carmine" ? "text-carmine" : "text-margin"; return <div className="manuscript-border bg-ink/40 p-4"><div className={`dossier-label ${colour}`}>{title}</div>{items && items.length > 0 ? <ul className="text-ivory/85 text-sm space-y-1 mt-2 list-disc list-inside">{items.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul> : <p className="text-margin text-xs mt-2">None.</p>}</div>; }
