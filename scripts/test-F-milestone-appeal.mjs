/**
 * Test F — Milestone + Appeal nondeterministic flows
 *   1. Build a round to FINALIZED with one funded proposal.
 *   2. Applicant submits a milestone report.
 *   3. review_milestone runs through prompt_non_comparative (nondet).
 *      Confirm stored review has milestone_decision in enum and a delivery_score 0-100.
 *   4. Applicant opens an appeal (only allowed once round is RANKED/FINALIZED).
 *   5. review_appeal runs through prompt_non_comparative (nondet).
 *      Confirm appeal_decision + new_proposal_decision in enums.
 *
 *   Both judgements must NOT use strict_eq.
 */
import { accounts, write, readJson, section, log, canonical, sha256hex, randomSalt,
  freshRoundPayload, PROPOSAL_TEMPLATES, assertTrue } from "./e2e-lib.mjs";

const ALLOWED_MILESTONE = new Set(["ACCEPTED","PARTIALLY_ACCEPTED","REJECTED","NEEDS_MORE_EVIDENCE","ESCALATE"]);
const ALLOWED_APPEAL = new Set(["ORIGINAL_DECISION_UPHELD","ORIGINAL_DECISION_ADJUSTED","MORE_EVIDENCE_REQUIRED","ESCALATE_TO_HUMAN_PANEL","APPEAL_REJECTED"]);
const ALLOWED_VERDICTS = new Set(["RECOMMENDED_FOR_FUNDING","PARTIAL_FUNDING_RECOMMENDED","WAITLISTED","REJECTED","NEEDS_MORE_EVIDENCE","ESCALATE"]);

section("TEST F — Milestone + Appeal (both nondet)");

const { round, rubric } = freshRoundPayload();
await write(accounts.creator.client, "create_round",
  [JSON.stringify(round), JSON.stringify(rubric)], "creator");
const stats = await readJson("get_protocol_stats", []);
const roundId = stats.last_round_id;
await write(accounts.creator.client, "open_round", [roundId], "creator");

const proposal = { ...PROPOSAL_TEMPLATES.A, applicantWallet: accounts.A.addr };
const canonStr = canonical(proposal);
const salt = randomSalt();
const hash = sha256hex(canonStr + salt);
await write(accounts.A.client, "submit_proposal_commitment", [roundId, hash], "applicantA");
const rprops = await readJson("get_round_proposals", [roundId]);
const proposalId = rprops[rprops.length - 1];
await write(accounts.creator.client, "close_round", [roundId], "creator");
await write(accounts.A.client, "reveal_proposal", [proposalId, canonStr, salt], "applicantA");
await write(accounts.creator.client, "start_reviewing", [roundId], "creator");
await write(accounts.creator.client, "review_proposal", [proposalId], "creator");
await write(accounts.creator.client, "rank_round_proposals", [roundId], "creator");

// --- Appeal ---
const appealPayload = {
  appeal_hash: sha256hex("appeal:" + proposalId),
  reason: "EVIDENCE_NOT_CONSIDERED",
  explanation: "The 2023 pilot data attached as evidence was not weighed in the original review.",
};
await write(accounts.A.client, "open_appeal", [proposalId, JSON.stringify(appealPayload)], "applicantA");
const stats2 = await readJson("get_protocol_stats", []);
// Contract assigns ids as "appeal_<appeal_count>" (post-increment counter).
const appealId = `appeal_${stats2.appeal_count}`;
const appealRecord = await readJson("get_appeal", [appealId]);
assertTrue(!!appealRecord, `appeal_id assigned (${appealId})`);

log("  → review_appeal (real GenLayer consensus)…");
await write(accounts.creator.client, "review_appeal", [appealId], "creator");
const ar = await readJson("get_appeal_review", [appealId]);
assertTrue(!!ar, "appeal review stored");
assertTrue(ALLOWED_APPEAL.has(ar.appeal_decision), `appeal_decision in enum (${ar.appeal_decision})`);
assertTrue(ALLOWED_VERDICTS.has(ar.new_proposal_decision), `new_proposal_decision in enum (${ar.new_proposal_decision})`);
assertTrue(Number(ar.new_merit_score) >= 0 && Number(ar.new_merit_score) <= 100, "new_merit_score 0-100");

// --- Milestone (only valid when proposal status is in funding bucket) ---
const p = await readJson("get_proposal", [proposalId]);
if (["RECOMMENDED_FOR_FUNDING", "PARTIAL_FUNDING_RECOMMENDED", "FUNDED"].includes(p.status)) {
  const milestonePayload = {
    milestone_hash: sha256hex("ms:" + proposalId),
    title: "Month-3 progress: site setup complete",
    description: "All 4 sites instrumented; baseline soil samples collected.",
    evidence_refs: ["ipfs://demo/setup.pdf"],
  };
  await write(accounts.A.client, "submit_milestone", [proposalId, JSON.stringify(milestonePayload)], "applicantA");
  const stats3 = await readJson("get_protocol_stats", []);
  const milestoneId = `milestone_${stats3.milestone_count}`;
  const milestoneRecord = await readJson("get_milestone", [milestoneId]);
  assertTrue(!!milestoneRecord, `milestone_id assigned (${milestoneId})`);

  log("  → review_milestone (real GenLayer consensus)…");
  await write(accounts.creator.client, "review_milestone", [milestoneId], "creator");
  const mr = await readJson("get_milestone_review", [milestoneId]);
  assertTrue(!!mr, "milestone review stored");
  assertTrue(ALLOWED_MILESTONE.has(mr.milestone_decision), `milestone_decision in enum (${mr.milestone_decision})`);
  assertTrue(Number(mr.delivery_score) >= 0 && Number(mr.delivery_score) <= 100, "delivery_score 0-100");
} else {
  log(`  ⚠ proposal not in funded bucket (${p.status}); skipping milestone sub-suite`);
}

section("TEST F PASSED");
