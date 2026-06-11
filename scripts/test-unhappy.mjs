/**
 * UNHAPPY PATH against the new contract.
 * Every field present in every payload - nothing is missing. The reverts
 * come from contract INVARIANTS being violated, not from validation of
 * missing data. Demonstrates that the contract's business rules hold.
 *
 *   1. Bad deadline ordering: complete round payload but
 *      application_deadline > reveal_deadline.  Expect: revert with
 *      "application_deadline must be <= reveal_deadline".
 *   2. Creator self-submit: creator wallet tries to commit to its own
 *      grant with a complete proposal payload. Expect: revert with
 *      "Grant creator cannot submit to their own grant round".
 *   3. Spoof reveal: applicant A commits, applicant B (different wallet)
 *      tries to reveal A's proposal_id with A's payload. Expect revert.
 *
 * Each step uses expectRevert; the suite FAILS if a revert step succeeds.
 */
import {
  accounts, write, readJson, section, log, canonical, sha256hex, randomSalt,
  expectRevert, CONTRACT,
} from "./e2e-lib.mjs";

section("UNHAPPY PATH - new contract " + CONTRACT);

const now = Math.floor(Date.now() / 1000);
const day = 86400;

// Wrapped in { items } because the contract's _json_load requires a dict.
const RUBRIC = {
  items: [
    { id: "r1", category: "RESEARCH_RELEVANCE", weight: 50, description: "Aligns with round goals.",
      strongEvidenceDefinition: "Direct fit.", weakEvidenceDefinition: "Loose fit." },
    { id: "r2", category: "FEASIBILITY", weight: 50, description: "Realistic plan.",
      strongEvidenceDefinition: "Realistic.", weakEvidenceDefinition: "Implausible." },
  ],
};

// ---------------------------------------------------------------------------
// Step 1. Bad deadline ordering. Complete payload, but app_deadline > reveal.
// ---------------------------------------------------------------------------
const BAD_ROUND = {
  title: "Invariant Test - Bad Deadline Ordering",
  description: "Deliberately bad deadline ordering; contract must reject.",
  funding_pool: 10000,
  currency: "USD",
  application_start: now - 60,
  application_deadline: now + 2 * day,   // <- AFTER reveal_deadline, violates invariant
  reveal_deadline: now + 1 * day,
  review_deadline: now + 3 * day,
  appeal_deadline: now + 4 * day,
  milestone_policy: "n/a",
  visibility: "PUBLIC",
  fundingOrganisation: "Meridian Test Lab",
  researchArea: "CLIMATE_RESEARCH",
  researchTheme: "Validator invariants",
  eligibilityCriteria: "n/a",
  maxAwardPerProposal: 5000,
  expectedAwardCount: 1,
  ethicsRequirements: "n/a",
  impactRequirements: "n/a",
  budgetRules: "n/a",
  requiredEvidenceTypes: ["CV"],
};

const err1 = await expectRevert(() =>
  write(
    accounts.creator.client,
    "create_round",
    [JSON.stringify(BAD_ROUND), JSON.stringify(RUBRIC)],
    "creator(bad-deadline-order)",
    { retries: 0 }
  )
);
log(`  Step 1 OK: bad deadline ordering rejected on-chain`);
log(`             ${err1.message.split("\n")[0].slice(0, 140)}`);

// ---------------------------------------------------------------------------
// Step 2. Set up a real round, then have CREATOR commit to it. Expect revert.
// ---------------------------------------------------------------------------
const GOOD_ROUND = {
  ...BAD_ROUND,
  title: "Invariant Test - Creator Self-Submit Guard",
  application_deadline: now + 30 * 60,
  reveal_deadline: now + day,
  review_deadline: now + 2 * day,
  appeal_deadline: now + 3 * day,
};

await write(
  accounts.creator.client,
  "create_round",
  [JSON.stringify(GOOD_ROUND), JSON.stringify(RUBRIC)],
  "creator"
);
const stats = await readJson("get_protocol_stats", []);
const roundId = stats.last_round_id;
log(`  setup: created roundId=${roundId}`);

await write(accounts.creator.client, "open_round", [roundId], "creator");
log(`  setup: opened ${roundId}`);

// Full proposal payload - nothing missing - but submitted by the round creator.
const CREATOR_PROPOSAL = {
  applicantWallet: accounts.creator.addr,
  title: "Self-funded research by the grant creator",
  public_summary: "Creator attempting to submit to own grant. Should be blocked.",
  category: "CLIMATE_RESEARCH",
  requested_amount: 4000,
  currency: "USD",
  abstract: "Creator-authored proposal that should be rejected by the contract's self-submit guard.",
  research_question: "Does the contract correctly block creator self-submission?",
  methodology: "Send the tx and observe the on-chain revert.",
  timeline: "Instant.",
  budget_breakdown: "Compute $2,000; analysis $2,000.",
  impact_claims: "Confirms contract invariant.",
  ethics_considerations: "n/a (test).",
  applicant_background: "Round creator (deliberately).",
  evidence_summary: "n/a (test).",
};
const canonCreator = canonical(CREATOR_PROPOSAL);
const saltCreator = randomSalt();
const hashCreator = sha256hex(canonCreator + saltCreator);

const err2 = await expectRevert(() =>
  write(
    accounts.creator.client,
    "submit_proposal_commitment",
    [roundId, hashCreator],
    "creator(self-submit)",
    { retries: 0 }
  )
);
log(`  Step 2 OK: creator self-submit rejected on-chain`);
log(`             ${err2.message.split("\n")[0].slice(0, 140)}`);

// ---------------------------------------------------------------------------
// Step 3. Applicant A commits a complete proposal. Applicant B then tries to
// reveal A's proposal_id with A's payload. Expect revert.
// ---------------------------------------------------------------------------
const A_PROPOSAL = {
  applicantWallet: accounts.A.addr,
  title: "Spoof-reveal Guard Test",
  public_summary: "Applicant A submits; applicant B will try to reveal.",
  category: "CLIMATE_RESEARCH",
  requested_amount: 5000,
  currency: "USD",
  abstract: "A complete proposal payload from applicant A.",
  research_question: "Does the contract block reveal by a non-owner?",
  methodology: "Have B attempt to call reveal_proposal for A's proposalId.",
  timeline: "Instant.",
  budget_breakdown: "Stipend $5,000.",
  impact_claims: "Confirms the spoof-reveal guard.",
  ethics_considerations: "n/a (test).",
  applicant_background: "Applicant A, throwaway test wallet.",
  evidence_summary: "n/a (test).",
};
const canonA = canonical(A_PROPOSAL);
const saltA = randomSalt();
const hashA = sha256hex(canonA + saltA);

await write(accounts.A.client, "submit_proposal_commitment", [roundId, hashA], "applicantA");
const ids = await readJson("get_round_proposals", [roundId]);
const proposalId = ids[ids.length - 1];
log(`  setup: A committed ${proposalId}`);

// Need to be in REVEAL_PHASE before reveal is allowed at all.
await write(accounts.creator.client, "close_round", [roundId], "creator");
log(`  setup: round closed -> REVEAL_PHASE`);

const err3 = await expectRevert(() =>
  write(
    accounts.B.client,
    "reveal_proposal",
    [proposalId, canonA, saltA],
    "applicantB(spoof-reveal)",
    { retries: 0 }
  )
);
log(`  Step 3 OK: spoof reveal by B rejected on-chain`);
log(`             ${err3.message.split("\n")[0].slice(0, 140)}`);

section("UNHAPPY PATH PASSED");
log(`\n  All three invariants held. roundId=${roundId} sits in REVEAL_PHASE on contract ${CONTRACT}.`);
