import Link from "next/link";
import ContractNotice from "@/components/ui/ContractNotice";

const meridianNodes = [
  { label: "Round Criteria", side: "left" },
  { label: "Proposal Text", side: "right" },
  { label: "Evidence Archive", side: "left" },
  { label: "Method Review", side: "right" },
  { label: "Impact Review", side: "left" },
  { label: "Funding Suitability", side: "right" },
  { label: "Consensus Decision", side: "left" },
];

const instruments = [
  { name: "Research Question Lens", desc: "Relevance, clarity, knowledge gap, novelty, alignment with funding call." },
  { name: "Methodology Grid", desc: "Method fit, research design strength, data availability, analytical soundness." },
  { name: "Impact Horizon", desc: "Academic/public contribution, beneficiary clarity, evidence for impact claims." },
  { name: "Budget Ledger", desc: "Budget realism, cost clarity, funding suitability, partial funding logic." },
  { name: "Feasibility Barometer", desc: "Timeline realism, applicant capability, resource access, dependency risk." },
];

export default function Landing() {
  return (
    <div>
      {/* Hero — Meridian Table */}
      <section className="relative max-w-7xl mx-auto px-6 pt-10 pb-20">
        <Link href="/rounds" className="tab-button absolute top-10 left-6">View Grant Rounds</Link>
        <Link href="#why-genlayer" className="dossier-label absolute bottom-6 right-6 underline-offset-4 hover:underline">
          Why this needed GenLayer →
        </Link>

        <div className="relative mt-16">
          {/* Plates around centre */}
          <div className="grid grid-cols-5 gap-2 mb-10 text-center">
            {["Question", "Method", "Impact", "Budget", "Feasibility"].map((p) => (
              <div key={p} className="manuscript-border py-3 dossier-label">{p}</div>
            ))}
          </div>

          <div className="text-center">
            <div className="dossier-label mb-3">A GenLayer Research Council Layer</div>
            <h1 className="heading text-6xl md:text-7xl text-ivory tracking-[0.08em]">MERITRA</h1>
            <p className="mt-6 text-ivory/80 max-w-2xl mx-auto text-lg">
              Research merit is contextual. MERITRA turns proposal text, impact claims, and
              feasibility evidence into consensus-backed funding recommendations.
            </p>
          </div>

          {/* Funding seal strip */}
          <div className="mt-10 flex justify-center">
            <Link href="/create-round" className="seal-tab text-base">◈ Create Research Grant Round</Link>
          </div>
        </div>

        <ContractNotice />
      </section>

      {/* Research Review Meridian */}
      <section className="relative max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="dossier-label">The Meridian</div>
          <h2 className="section-title mt-2">Research Review Meridian</h2>
        </div>
        <div className="relative">
          <div className="meridian-line absolute left-1/2 -translate-x-1/2 top-0 bottom-0" />
          <div className="space-y-10">
            {meridianNodes.map((n, i) => (
              <div key={n.label} className={`flex ${n.side === "left" ? "justify-start" : "justify-end"}`}>
                <div className="w-1/2 px-6">
                  <div className={`manuscript-border bg-manuscript/60 p-4 ${n.side === "left" ? "text-right" : "text-left"}`}>
                    <div className="dossier-label">Node {String(i + 1).padStart(2, "0")}</div>
                    <div className="heading text-ivory text-xl mt-1">{n.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why research grant review is hard */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="dossier-label">Section II</div>
        <h2 className="section-title mt-2">Why research grant review is hard</h2>
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {[
            "Strong proposals are not always the loudest, longest, or most polished.",
            "Whether a methodology fits a question is judgement, not a checklist.",
            "Budget reasonableness depends on scope, not on a fixed formula.",
            "Impact claims must be weighed against evidence.",
            "Originality cannot be reduced to a string match.",
            "Comparative ranking needs context, not just averages.",
          ].map((t) => (
            <div key={t} className="manuscript-border bg-manuscript/50 p-5 text-ivory/85">{t}</div>
          ))}
        </div>
      </section>

      {/* How MERITRA works */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="dossier-label">Section III</div>
        <h2 className="section-title mt-2">How MERITRA works</h2>
        <ol className="mt-8 space-y-4 text-ivory/85">
          {[
            "Admin creates a research grant round and rubric.",
            "Applicants submit research proposals.",
            "Applicants attach supporting evidence.",
            "Admin closes the round.",
            "GenLayer validators review each proposal against the rubric and evidence.",
            "GenLayer produces a consensus ranking and funding recommendation.",
            "Applicants may appeal; funded proposals submit milestone reports.",
          ].map((t, i) => (
            <li key={t} className="flex gap-4">
              <span className="mono text-gold w-8">{String(i + 1).padStart(2, "0")}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Review Instruments */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="dossier-label">Section IV</div>
        <h2 className="section-title mt-2">Review Instruments</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {instruments.map((inst, i) => (
            <div
              key={inst.name}
              className={`instrument-card ${i === 0 ? "md:col-span-2" : ""} ${i === 4 ? "md:col-span-2" : ""}`}
            >
              <div className="dossier-label">Instrument 0{i + 1}</div>
              <div className="heading text-ivory text-2xl mt-1">{inst.name}</div>
              <p className="text-margin mt-2">{inst.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why this needed GenLayer */}
      <section id="why-genlayer" className="max-w-5xl mx-auto px-6 py-16">
        <div className="dossier-label">Council Note</div>
        <h2 className="section-title mt-2">Why this needed GenLayer</h2>
        <div className="manuscript-border bg-manuscript/60 p-6 mt-6 text-ivory/85 leading-relaxed">
          A deterministic smart contract can hold proposal records, deadlines, budgets,
          and votes. It cannot judge whether a research question matters, whether a
          method fits, whether impact claims are credible, whether a budget is reasonable
          for the scope, or whether the proposal should be fully funded, partially funded,
          waitlisted, rejected, or asked for more evidence. MERITRA uses GenLayer
          consensus to make that judgement structured, transparent, and reviewable.
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <Link href="/create-round" className="seal-tab">◈ Create Research Grant Round</Link>
      </section>
    </div>
  );
}
