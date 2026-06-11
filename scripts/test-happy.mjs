/**
 * HAPPY PATH against the new contract.
 * Fully structured: every contract-required round field present, every
 * proposal field present, deadlines correctly ordered. Walks the lifecycle
 * up to start_reviewing so the contract has real revealed state the UI can
 * render on /rounds and /rounds/[id]/proposals/[pid].
 *
 *   creator   -> create_round (full round + full rubric)
 *             -> open_round
 *   applicantA -> submit_proposal_commitment (canonical hash of full proposal)
 *   creator   -> close_round                  (-> REVEAL_PHASE)
 *   applicantA -> reveal_proposal             (content now public on /proposals/<id>)
 *   creator   -> start_reviewing              (-> REVIEWING; review/rank buttons enabled)
 */
import { accounts, write, readJson, section, log, canonical, sha256hex, randomSalt, CONTRACT } from "./e2e-lib.mjs";

section("HAPPY PATH - new contract " + CONTRACT);

const now = Math.floor(Date.now() / 1000);
const day = 86400;

// Every field the contract validates is present.
const ROUND = {
  title: "Climate Resilience Research Grant - Q3 2026",
  description:
    "Funding pilot studies that strengthen climate resilience in coastal and semi-arid communities. " +
    "Proposals should demonstrate clear methodology, credible impact pathways, and realistic budgets.",
  funding_pool: 60000,
  currency: "USD",
  application_start: now - 60,
  application_deadline: now + 30 * 60,
  reveal_deadline: now + day,
  review_deadline: now + 2 * day,
  appeal_deadline: now + 3 * day,
  milestone_policy: "Two milestones, 60/40 disbursement, evidence reviewed by GenLayer.",
  visibility: "PUBLIC",
  fundingOrganisation: "Meridian Research Foundation",
  researchArea: "CLIMATE_RESEARCH",
  researchTheme: "Coastal and semi-arid resilience",
  eligibilityCriteria: "Open to early-career researchers and small research collectives.",
  maxAwardPerProposal: 20000,
  expectedAwardCount: 3,
  ethicsRequirements: "IRB or equivalent ethics letter required before funding release.",
  impactRequirements: "Beneficiary clarity and a measurable impact indicator.",
  budgetRules: "No more than 30% on equipment; salary capped at 50%.",
  requiredEvidenceTypes: ["CV", "PILOT_STUDY_RESULT", "FIELDWORK_PLAN"],
};

// Rubric wrapped in { items } because the contract's _json_load requires a
// dict for rubric_json. The frontend round detail page unwraps either shape.
const RUBRIC = {
  items: [
    { id: "r1", category: "RESEARCH_RELEVANCE",   weight: 20, description: "Aligns with round goals.",
      strongEvidenceDefinition: "Directly addresses a documented gap in the round area.",
      weakEvidenceDefinition: "Loosely tangential to the round area." },
    { id: "r2", category: "METHODOLOGY_QUALITY",  weight: 20, description: "Sound research design.",
      strongEvidenceDefinition: "Method is appropriate, sample-size justified, controls present.",
      weakEvidenceDefinition: "Method unclear or unsuited to the question." },
    { id: "r3", category: "FEASIBILITY",          weight: 20, description: "Realistic plan and capability.",
      strongEvidenceDefinition: "Timeline realistic, team has prior work.",
      weakEvidenceDefinition: "Timeline implausible or applicant capability unproven." },
    { id: "r4", category: "EXPECTED_IMPACT",      weight: 20, description: "Credible expected impact.",
      strongEvidenceDefinition: "Impact pathway is specific and evidence-backed.",
      weakEvidenceDefinition: "Impact claims vague or overstated." },
    { id: "r5", category: "BUDGET_REASONABLENESS",weight: 20, description: "Costs justified for the work.",
      strongEvidenceDefinition: "Costs itemised and consistent with the methodology.",
      weakEvidenceDefinition: "Inflated line items or missing detail." },
  ],
};

// Full proposal payload - every UI field present.
const PROPOSAL = {
  applicantWallet: accounts.A.addr,
  title: "Drought-resilient maize trial in semi-arid Kenya",
  public_summary:
    "Twelve-month pilot trial of three drought-tolerant maize cultivars across four districts " +
    "in semi-arid Kenya, co-designed with smallholder farmers.",
  category: "AGRICULTURE",
  requested_amount: 14000,
  currency: "USD",
  abstract:
    "We will evaluate three drought-tolerant maize cultivars against a regional control under " +
    "semi-arid stress, using farmer-co-designed plots and soil moisture instrumentation. The trial " +
    "will produce yield and water-use data alongside farmer feedback.",
  research_question:
    "Which drought-tolerant maize variety delivers the best combination of yield and water-use " +
    "efficiency under semi-arid stress in the trial districts?",
  methodology:
    "Randomised plot trial at four sites, three replicates per site, soil moisture probes at " +
    "15 cm and 45 cm, weekly canopy imaging, end-of-season yield + grain quality assays.",
  timeline:
    "Months 1-2 site preparation and farmer co-design; months 3-9 trial and weekly measurement; " +
    "months 10-12 analysis, validation, and dissemination.",
  budget_breakdown:
    "Seed and inputs $3,000; soil moisture probes and imaging $4,000; fieldwork and farmer " +
    "honoraria $5,000; lab analysis and dissemination $2,000.",
  impact_claims:
    "Could lift smallholder yields by 15-25% across the trial districts; outputs disseminated " +
    "via extension service briefings and an open dataset.",
  ethics_considerations:
    "Written farmer consent for plot access; fair compensation for time; data shared back with " +
    "participating communities before publication.",
  applicant_background:
    "MSc Agronomy with four prior field trials, two co-authored publications, and an existing " +
    "relationship with the regional extension service.",
  evidence_summary:
    "Attached: 2023 pilot trial dataset (CSV), letters of support from two district agriculture " +
    "offices, full CV, and methodology supplement.",
};

// 1. Creator -> create_round
await write(accounts.creator.client, "create_round",
  [JSON.stringify(ROUND), JSON.stringify(RUBRIC)], "creator");
const stats = await readJson("get_protocol_stats", []);
const roundId = stats.last_round_id;
log(`  roundId = ${roundId}`);

// 2. Creator -> open_round
await write(accounts.creator.client, "open_round", [roundId], "creator");
const r1 = await readJson("get_round", [roundId]);
log(`  round.status after open = ${r1.status}`);

// 3. Applicant A -> commit
const canonStr = canonical(PROPOSAL);
const salt = randomSalt();
const hash = sha256hex(canonStr + salt);
await write(accounts.A.client, "submit_proposal_commitment", [roundId, hash], "applicantA");
const ridList = await readJson("get_round_proposals", [roundId]);
const proposalId = ridList[ridList.length - 1];
log(`  proposalId = ${proposalId}`);

// 4. Creator -> close_round (-> REVEAL_PHASE)
await write(accounts.creator.client, "close_round", [roundId], "creator");
const r2 = await readJson("get_round", [roundId]);
log(`  round.status after close = ${r2.status}`);

// 5. Applicant A -> reveal (content becomes public)
await write(accounts.A.client, "reveal_proposal", [proposalId, canonStr, salt], "applicantA");
const p = await readJson("get_proposal", [proposalId]);
log(`  proposal.status after reveal = ${p.status}  revealed=${p.revealed}  title="${p.title}"`);

// 6. Creator -> start_reviewing (UI now shows "RUN CONSENSUS REVIEW" button)
await write(accounts.creator.client, "start_reviewing", [roundId], "creator");
const r3 = await readJson("get_round", [roundId]);
log(`  round.status after start_reviewing = ${r3.status}`);

section("HAPPY PATH PASSED");
log(`\n  Live on contract ${CONTRACT}:`);
log(`    /rounds                                        (lists ${roundId})`);
log(`    /rounds/${roundId}                            (shows round detail + ${ridList.length} proposal)`);
log(`    /rounds/${roundId}/proposals/${proposalId}    (revealed content + RUN CONSENSUS REVIEW button)`);
