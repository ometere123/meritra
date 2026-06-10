"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getRound, getRubric, getRoundProposals, getProposal, getRoundRanking, getProposalReview,
  closeRound, finalizeRound, openRound, startReviewing,
} from "@/lib/genlayer/contracts";
import ContractNotice from "@/components/ui/ContractNotice";
import { getAccountAddress } from "@/lib/genlayer/client";
import { lifecycleLabel } from "@/lib/proposalLifecycle";

const toSecs = (v?: string | number) => typeof v === "number" ? v : v ? Math.floor(new Date(v).getTime() / 1000) : 0;
const nowSecs = () => Math.floor(Date.now() / 1000);

export default function RoundDetail() {
  const params = useParams();
  const roundId = params.roundId as string;
  const [round, setRound] = useState<any>(null);
  const [rubric, setRubric] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentWallet = getAccountAddress();
  const isCreator = !!round?.creator && round.creator.toLowerCase() === currentWallet.toLowerCase();
  const isOpen = round?.status === "OPEN";
  const isRevealPhase = round?.status === "REVEAL_PHASE";
  const isClosed = round?.status === "CLOSED";
  const isReviewing = round?.status === "REVIEWING";
  const canSubmit = isOpen && nowSecs() >= toSecs(round?.application_start) && nowSecs() <= toSecs(round?.application_deadline) && !isCreator;
  const canStartReview = (isRevealPhase || isClosed) && isCreator;

  const load = async () => {
    setLoading(true);
    try {
      const [r, rb, ids, rk] = await Promise.all([
        getRound(roundId), getRubric(roundId),
        getRoundProposals(roundId), getRoundRanking(roundId),
      ]);
      setRound(r);
      setRubric(rb || []);
      setRanking(rk);
      const props = await Promise.all(ids.map(async (id) => {
        const p = await getProposal(id);
        if (!p) return null;
        const rv = await getProposalReview(id).catch(() => null);
        return { id, ...p, _hasReview: !!rv };
      }));
      setProposals(props.filter(Boolean));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [roundId]);

  const action = async (fn: () => Promise<string>, label: string) => {
    setBusy(label);
    try { await fn(); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };

  const publicSummary = useMemo(() => round?.public_summary || round?.description || "—", [round]);

  if (loading) return <div className="max-w-7xl mx-auto px-6 py-12 text-margin">Loading round...</div>;
  return <div className="max-w-7xl mx-auto px-6 py-12">
    <ContractNotice />
    {!round ? <div className="manuscript-border p-8 bg-manuscript/50"><div className="heading text-ivory text-2xl">Round not found.</div><Link href="/rounds" className="tab-button mt-4 inline-flex">Back to rounds</Link></div> : <>
      <div className="manuscript-border bg-manuscript/70 p-6">
        <div className="flex justify-between items-start gap-6 flex-wrap">
          <div>
            <div className="dossier-label mono">{roundId}</div>
            <h1 className="heading text-ivory text-4xl mt-1">{round.title}</h1>
            <div className="text-margin mt-1">{round.fundingOrganisation}</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canSubmit ? <Link href={`/rounds/${roundId}/submit-proposal`} className="seal-tab text-xs">Submit Sealed Application</Link> : <div className="tab-button text-xs opacity-70">{isCreator ? "Creator cannot submit" : "Commitments closed"}</div>}
            <Link href="/reveal" className="tab-button text-xs">My Reveal Dashboard</Link>
            {round.status === "DRAFT" && isCreator && <button onClick={() => action(() => openRound(roundId), "open")} className="seal-tab text-xs">{busy === "open" ? "Opening..." : "Open Round"}</button>}
            {isOpen && isCreator && <button onClick={() => action(() => closeRound(roundId), "close")} className="tab-button">{busy === "close" ? "Closing..." : "Close Commitments → Reveal Phase"}</button>}
            {canStartReview && <button onClick={() => action(() => startReviewing(roundId), "reviewing")} className="seal-tab text-xs">{busy === "reviewing" ? "Starting..." : "Start Reviewing"}</button>}
            {(isReviewing || round.status === "RANKED") && isCreator && <button onClick={() => action(() => finalizeRound(roundId), "fin")} className="tab-button">{busy === "fin" ? "Finalizing..." : "Finalize"}</button>}
          </div>
        </div>
        <div className="grid md:grid-cols-5 gap-4 mt-6">
          <Meta label="Status" value={round.status} accent />
          <Meta label="Area" value={round.researchArea} />
          <Meta label="Pool" value={`${round.funding_pool || round.fundingPool || 0} ${round.currency || ""}`} />
          <Meta label="Deadline" value={round.application_deadline ? new Date(toSecs(round.application_deadline) * 1000).toISOString().slice(0, 10) : "—"} />
          <Meta label="Proposals" value={proposals.length} />
        </div>
      </div>
      <Section title="Round Criteria">
        <p className="text-ivory/85 whitespace-pre-wrap">{publicSummary}</p>
        {round.eligibilityCriteria && <div className="mt-4"><div className="dossier-label">Eligibility</div><p className="text-ivory/85 whitespace-pre-wrap">{round.eligibilityCriteria}</p></div>}
      </Section>
      <Section title="Rubric Forge">
        <div className="grid md:grid-cols-2 gap-3">{rubric.map((r: any) => <div key={r.id} className="manuscript-border bg-ink/40 p-4"><div className="flex justify-between"><span className="mono text-gold text-sm">{r.category}</span><span className="score-pill">w {r.weight}</span></div><p className="text-ivory/80 text-sm mt-2">{r.description}</p>{r.strongEvidenceDefinition && <p className="text-margin text-xs mt-2"><em>Strong:</em> {r.strongEvidenceDefinition}</p>}{r.weakEvidenceDefinition && <p className="text-margin text-xs"><em>Weak:</em> {r.weakEvidenceDefinition}</p>}</div>)}</div>
      </Section>
      <Section title="Proposal Archive">
        {proposals.length === 0 ? <div className="manuscript-border p-6 bg-manuscript/40 text-center"><div className="heading text-ivory text-xl">No applications submitted yet.</div><p className="text-margin">Share this round or commit the first sealed application.</p></div> : <div className="space-y-3">{proposals.map((p) => {
          const revealed = !!p.revealed;
          const label = lifecycleLabel({
            status: p.status,
            revealed,
            roundStatus: round?.status,
            hasReview: !!p._hasReview,
            hasRanking: !!ranking,
          });
          return <Link key={p.id} href={`/rounds/${roundId}/proposals/${p.id}`} className="block manuscript-border bg-ink/40 p-4 hover:bg-ink/60">
            <div className="flex justify-between flex-wrap gap-2">
              <div>
                <div className="mono text-xs text-margin">{p.id}</div>
                <div className="heading text-ivory text-lg">{revealed ? (p.title || "Untitled") : "Sealed application (hidden before reveal)"}</div>
                <div className="text-margin text-sm mono">applicant: {p.applicant ? p.applicant.slice(0, 10) + "…" : "—"}</div>
              </div>
              <div className="text-right">
                <div className="score-pill">{label}</div>
                <div className="text-margin text-[10px] mt-1 mono">on-chain: {p.status}</div>
                {revealed && <div className="text-margin text-xs mt-1 mono">{p.requested_amount || 0} {p.currency || ""}</div>}
              </div>
            </div>
          </Link>;
        })}</div>}
      </Section>
      <Section title="Consensus Ranking">
        <div className="dossier-label">Generated by GenLayer consensus</div>
        <h2 className="section-title mt-1">GenLayer Round Ranking</h2>
        <p className="text-margin text-sm mt-2">Consensus-backed funding recommendation and tie-break reasoning.</p>
        {!ranking ? <p className="text-margin mt-4">No consensus ranking yet. Close the round and start reviewing.</p> : <div className="space-y-4 mt-4">
          <div className="decision-seal">
            <div className="grid md:grid-cols-4 gap-4 mono text-sm">
              <Meta label="Ranking status" value={ranking.ranking_status} accent />
              <Meta label="Reviewed" value={ranking.total_proposals_reviewed} />
              <Meta label="Ranking confidence" value={`${ranking.ranking_confidence}%`} />
              <Meta label="Funding summary" value={`${ranking.funding_summary?.total_recommended || 0} ${ranking.funding_summary?.currency || ""}`} />
            </div>
          </div>
          <div className="space-y-2">{ranking.ranked_proposals?.map((rp: any) => <div key={rp.proposal_id} className="manuscript-border bg-ink/40 p-4 flex justify-between items-center"><div className="flex items-center gap-4"><span className="heading text-gold text-2xl">#{rp.rank}</span><div><Link href={`/rounds/${roundId}/proposals/${rp.proposal_id}`} className="mono text-xs text-margin hover:text-gold">{rp.proposal_id}</Link><div className="text-ivory text-sm mt-1">{rp.reason}</div></div></div><div className="text-right"><div className="score-pill">{rp.decision}</div><div className="mono text-xs text-margin mt-1">merit {rp.merit_score} · recommended {rp.recommended_funding || 0}</div></div></div>)}</div>
          <Block title="Round findings" items={ranking.round_findings} />
          <Block title="Tie-break reasoning" items={ranking.tie_breaks} />
          <Block title="Red flags" items={ranking.red_flags} />
          <div className="manuscript-border bg-manuscript/60 p-5"><div className="dossier-label">Reasoning summary</div><p className="text-ivory/85 mt-1">{ranking.reasoning_summary}</p></div>
        </div>}
      </Section>
      {error && <div className="text-carmine mt-6">{error}</div>}
      <Section title="Why this needed GenLayer"><div className="manuscript-border bg-manuscript/60 p-5 text-ivory/85">Ranking research proposals across this round requires interpretation of methodology, feasibility, impact claims, budget, originality, evidence strength, and tie-break reasoning. That judgement cannot be reduced to a deterministic formula. GenLayer validators produce a structured consensus ranking that updates round state on-chain.</div></Section>
    </>}
  </div>;
}

function Section({ title, children }: any) { return <section className="mt-10"><div className="dossier-label">Section</div><h2 className="section-title mt-1 mb-4">{title}</h2><div>{children}</div></section>; }
function Meta({ label, value, accent }: any) { return <div className="manuscript-border bg-ink/40 p-3"><div className="dossier-label">{label}</div><div className={`mono text-sm mt-1 ${accent ? "text-gold" : "text-ivory"}`}>{value}</div></div>; }
function Block({ title, items }: { title: string; items?: string[] }) { if (!items || items.length === 0) return null; return <div><div className="dossier-label">{title}</div><ul className="list-disc list-inside text-ivory/85 text-sm space-y-1 mt-1">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div>; }
