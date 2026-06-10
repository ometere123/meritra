"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoundWithId, ContractNotConfiguredError } from "@/lib/genlayer/contracts";
import { RESEARCH_AREAS, RUBRIC_CATEGORIES, EVIDENCE_TYPES } from "@/lib/constants";
import ContractNotice from "@/components/ui/ContractNotice";

type RubricRow = {
  id: string;
  category: string;
  weight: number;
  description: string;
  strongEvidenceDefinition: string;
  weakEvidenceDefinition: string;
};

const initialRubric = (): RubricRow[] => RUBRIC_CATEGORIES.slice(0, 6).map((c, i) => ({
  id: `r${i + 1}`,
  category: c,
  weight: 10,
  description: "",
  strongEvidenceDefinition: "",
  weakEvidenceDefinition: "",
}));

const toUnixSeconds = (value: string) => value ? Math.floor(new Date(value).getTime() / 1000) : 0;

export default function CreateRound() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    fundingPool: 0,
    currency: "USD",
    applicationStart: new Date().toISOString().slice(0, 10),
    applicationDeadline: "",
    revealDeadline: "",
    reviewDeadline: "",
    appealDeadline: "",
    milestonePolicy: "",
    visibility: "PUBLIC",
    fundingOrganisation: "",
    researchArea: "AI_RESEARCH",
    researchTheme: "",
    eligibilityCriteria: "",
    maxAwardPerProposal: 0,
    expectedAwardCount: 0,
    ethicsRequirements: "",
    impactRequirements: "",
    budgetRules: "",
    requiredEvidenceTypes: [] as string[],
  });
  const [rubric, setRubric] = useState<RubricRow[]>(initialRubric());

  const upd = (k: string, v: any) => setForm({ ...form, [k]: v });

  const submit = async () => {
    setErr(null);
    setSubmitting(true);
    try {
      const roundJson = {
        title: form.title,
        description: form.description,
        funding_pool: form.fundingPool,
        currency: form.currency,
        application_start: toUnixSeconds(form.applicationStart),
        application_deadline: toUnixSeconds(form.applicationDeadline),
        reveal_deadline: toUnixSeconds(form.revealDeadline),
        review_deadline: toUnixSeconds(form.reviewDeadline),
        appeal_deadline: toUnixSeconds(form.appealDeadline),
        milestone_policy: form.milestonePolicy,
        visibility: form.visibility,
        status: "DRAFT",
        fundingOrganisation: form.fundingOrganisation,
        researchArea: form.researchArea,
        researchTheme: form.researchTheme,
        eligibilityCriteria: form.eligibilityCriteria,
        maxAwardPerProposal: form.maxAwardPerProposal,
        expectedAwardCount: form.expectedAwardCount,
        ethicsRequirements: form.ethicsRequirements,
        impactRequirements: form.impactRequirements,
        budgetRules: form.budgetRules,
        requiredEvidenceTypes: form.requiredEvidenceTypes,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const { roundId } = await createRoundWithId(JSON.stringify(roundJson), JSON.stringify(rubric));
      router.push(`/rounds/${roundId}`);
    } catch (e) {
      if (e instanceof ContractNotConfiguredError) setErr("GenLayer contract is not configured.");
      else setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const sections = ["Organisation", "Research", "Eligibility", "Rubric", "Funding", "Ethics", "Deadlines", "Evidence", "Policy", "Review"];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="dossier-label">Grant Round Foundry</div>
      <h1 className="section-title mt-1">Create Research Grant Round</h1>
      <ContractNotice />
      <div className="flex gap-1 mt-8 flex-wrap">
        {sections.map((s, i) => (
          <button key={s} onClick={() => setStep(i + 1)} className={`tab-button text-[10px] ${step === i + 1 ? "bg-gold/10 border-gold text-gold" : ""}`}>
            {String(i + 1).padStart(2, "0")} {s}
          </button>
        ))}
      </div>
      <div className="manuscript-border bg-manuscript/60 p-6 mt-6 space-y-4">
        {step === 1 && <>
          <Field label="Round Title" value={form.title} onChange={(v) => upd("title", v)} />
          <Field label="Funding Organisation" value={form.fundingOrganisation} onChange={(v) => upd("fundingOrganisation", v)} />
          <Field label="Description" textarea value={form.description} onChange={(v) => upd("description", v)} />
        </>}
        {step === 2 && <>
          <Select label="Research Area" value={form.researchArea} options={RESEARCH_AREAS as any} onChange={(v) => upd("researchArea", v)} />
          <Field label="Research Theme" value={form.researchTheme} onChange={(v) => upd("researchTheme", v)} />
        </>}
        {step === 3 && <Field label="Eligibility Criteria" textarea value={form.eligibilityCriteria} onChange={(v) => upd("eligibilityCriteria", v)} />}
        {step === 4 && <RubricEditor rubric={rubric} setRubric={setRubric} />}
        {step === 5 && <div className="grid grid-cols-2 gap-4">
          <Field label="Funding Pool" type="number" value={form.fundingPool} onChange={(v) => upd("fundingPool", Number(v))} />
          <Field label="Currency" value={form.currency} onChange={(v) => upd("currency", v)} />
          <Field label="Max Award per Proposal" type="number" value={form.maxAwardPerProposal} onChange={(v) => upd("maxAwardPerProposal", Number(v))} />
          <Field label="Expected Award Count" type="number" value={form.expectedAwardCount} onChange={(v) => upd("expectedAwardCount", Number(v))} />
        </div>}
        {step === 6 && <>
          <Field label="Milestone Policy" textarea value={form.milestonePolicy} onChange={(v) => upd("milestonePolicy", v)} />
          <Field label="Ethics Requirements" textarea value={form.ethicsRequirements} onChange={(v) => upd("ethicsRequirements", v)} />
          <Field label="Impact Requirements" textarea value={form.impactRequirements} onChange={(v) => upd("impactRequirements", v)} />
          <Field label="Budget Rules" textarea value={form.budgetRules} onChange={(v) => upd("budgetRules", v)} />
        </>}
        {step === 7 && <div className="grid grid-cols-2 gap-4">
          <Field label="Application Start" type="date" value={form.applicationStart} onChange={(v) => upd("applicationStart", v)} />
          <Field label="Application Deadline (commit)" type="date" value={form.applicationDeadline} onChange={(v) => upd("applicationDeadline", v)} />
          <Field label="Reveal Deadline" type="date" value={form.revealDeadline} onChange={(v) => upd("revealDeadline", v)} />
          <Field label="Review Deadline" type="date" value={form.reviewDeadline} onChange={(v) => upd("reviewDeadline", v)} />
          <Field label="Appeal Deadline" type="date" value={form.appealDeadline} onChange={(v) => upd("appealDeadline", v)} />
        </div>}
        {step === 8 && <div>
          <div className="dossier-label mb-2">Required Evidence Types</div>
          <div className="grid grid-cols-2 gap-2">
            {EVIDENCE_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-2 text-ivory text-sm">
                <input type="checkbox" checked={form.requiredEvidenceTypes.includes(t)} onChange={(e) => {
                  const next = e.target.checked ? [...form.requiredEvidenceTypes, t] : form.requiredEvidenceTypes.filter((x) => x !== t);
                  upd("requiredEvidenceTypes", next);
                }} />
                <span className="mono text-xs">{t}</span>
              </label>
            ))}
          </div>
        </div>}
        {step === 9 && <Field label="Visibility" value={form.visibility} onChange={(v) => upd("visibility", v)} />}
        {step === 10 && <div className="space-y-3">
          <div className="dossier-label">Review and Create</div>
          <pre className="text-xs text-margin overflow-auto max-h-80 bg-ink/40 p-3 mono">{JSON.stringify({ form, rubric, deadlines: {
            application_start: toUnixSeconds(form.applicationStart),
            application_deadline: toUnixSeconds(form.applicationDeadline),
            reveal_deadline: toUnixSeconds(form.revealDeadline),
            review_deadline: toUnixSeconds(form.reviewDeadline),
            appeal_deadline: toUnixSeconds(form.appealDeadline),
          } }, null, 2)}</pre>
          {err && <div className="text-carmine text-sm">{err}</div>}
          <button onClick={submit} disabled={submitting} className="seal-tab">{submitting ? "Sealing..." : "Create Round On-Chain"}</button>
        </div>}
      </div>
      <div className="flex justify-between mt-6">
        <button onClick={() => setStep(Math.max(1, step - 1))} className="tab-button">Previous</button>
        <button onClick={() => setStep(Math.min(10, step + 1))} className="tab-button">Next</button>
      </div>
    </div>
  );
}

type FieldProps = { label: string; value: string | number; onChange: (value: string) => void; textarea?: boolean; type?: string; mono?: boolean; };
function Field({ label, value, onChange, textarea, type, mono }: FieldProps) {
  return <label className="block"><div className="dossier-label mb-1">{label}</div>{textarea ? <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-ink/60 border border-graphite p-3 text-ivory text-sm" /> : <input type={type || "text"} value={value} onChange={(e) => onChange(e.target.value)} className={`w-full bg-ink/60 border border-graphite p-3 text-ivory text-sm ${mono ? "mono" : ""}`} />}</label>;
}
type SelectProps = { label: string; value: string; options: readonly string[]; onChange: (value: string) => void; };
function Select({ label, value, options, onChange }: SelectProps) {
  return <label className="block"><div className="dossier-label mb-1">{label}</div><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-ink/60 border border-graphite p-3 text-ivory text-sm mono">{options.map((o: string) => <option key={o} value={o}>{o}</option>)}</select></label>;
}
function RubricEditor({ rubric, setRubric }: { rubric: RubricRow[]; setRubric: (r: RubricRow[]) => void }) {
  const update = (i: number, k: keyof RubricRow, v: any) => { const next = [...rubric]; (next[i] as any)[k] = v; setRubric(next); };
  const add = () => setRubric([...rubric, { id: `r${rubric.length + 1}`, category: "EVIDENCE_STRENGTH", weight: 10, description: "", strongEvidenceDefinition: "", weakEvidenceDefinition: "" }]);
  return <div className="space-y-4"><div className="dossier-label">Rubric Forge</div>{rubric.map((r, i) => <div key={r.id} className="manuscript-border p-3 bg-ink/40 space-y-2"><div className="grid grid-cols-3 gap-2"><Select label="Category" value={r.category} options={RUBRIC_CATEGORIES as any} onChange={(v: string) => update(i, "category", v)} /><Field label="Weight" type="number" value={r.weight} onChange={(v: string) => update(i, "weight", Number(v))} /><Field label="Minimum Standard" value={r.description} onChange={(v: string) => update(i, "description", v)} /></div><Field label="What strong evidence looks like" value={r.strongEvidenceDefinition} onChange={(v: string) => update(i, "strongEvidenceDefinition", v)} /><Field label="What weak evidence looks like" value={r.weakEvidenceDefinition} onChange={(v: string) => update(i, "weakEvidenceDefinition", v)} /></div>)}<button type="button" onClick={add} className="tab-button">+ Add Rubric Item</button></div>;
}
