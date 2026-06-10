/**
 * Test D — Nondeterministic scoring
 *   1. Build a round with one revealed proposal.
 *   2. start_reviewing.
 *   3. Confirm review_proposal cannot run BEFORE reveal (would have failed
 *      earlier — we proved this in tests A/C indirectly).
 *   4. Call review_proposal on the revealed proposal.
 *   5. Confirm the tx is ACCEPTED (not UNDETERMINED) — leader_receipt's
 *      execution_result must be SUCCESS/ACCEPTED.
 *   6. Read back the stored review and assert schema: verdict, merit_score,
 *      risk_level, confidence, recommended_funding_amount, reasoning_summary.
 *
 *   Note: this suite REQUIRES the contract to use prompt_non_comparative on
 *   review_proposal (strict_eq cannot survive free-text LLM output).
 */
import { accounts, write, readJson, section, log, canonical, sha256hex, randomSalt,
  freshRoundPayload, PROPOSAL_TEMPLATES, assertEq, assertTrue } from "./e2e-lib.mjs";

const ALLOWED_VERDICTS = new Set(["RECOMMENDED_FOR_FUNDING","PARTIAL_FUNDING_RECOMMENDED","WAITLISTED","REJECTED","NEEDS_MORE_EVIDENCE","ESCALATE"]);
const ALLOWED_FUNDING = new Set(["VERY_HIGH","HIGH","MODERATE","LOW","NOT_SUITABLE","UNCLEAR"]);
const ALLOWED_RISK = new Set(["LOW","MEDIUM","HIGH","CRITICAL"]);
const ALLOWED_PLAG = new Set(["LOW","MEDIUM","HIGH","CRITICAL"]);

section("TEST D — Nondet review (uses prompt_non_comparative)");

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

// Run the nondet review (slow)
log("  → invoking review_proposal (real GenLayer consensus, may take 30-120s)…");
await write(accounts.creator.client, "review_proposal", [proposalId], "creator");

const review = await readJson("get_proposal_review", [proposalId]);
assertTrue(!!review, "review exists on-chain");
assertTrue(ALLOWED_VERDICTS.has(review.verdict), `verdict in enum (${review.verdict})`);
assertTrue(ALLOWED_FUNDING.has(review.funding_suitability), `funding_suitability in enum (${review.funding_suitability})`);
assertTrue(ALLOWED_RISK.has(review.risk_level), `risk_level in enum (${review.risk_level})`);
assertTrue(ALLOWED_PLAG.has(review.originality?.plagiarism_risk), `plagiarism_risk in enum (${review.originality?.plagiarism_risk})`);
assertTrue(Number(review.merit_score) >= 0 && Number(review.merit_score) <= 100, "merit_score 0-100");
assertTrue(Number(review.confidence) >= 0 && Number(review.confidence) <= 100, "confidence 0-100");
assertTrue(Number(review.recommended_funding_amount) >= 0, "recommended_funding_amount non-negative");
assertTrue(typeof review.reasoning_summary === "string" && review.reasoning_summary.length > 0, "reasoning_summary non-empty");

log(`  verdict=${review.verdict} merit=${review.merit_score} conf=${review.confidence} rec=${review.recommended_funding_amount}`);
section("TEST D PASSED");
console.log("__STATE__" + JSON.stringify({ roundId, proposalId }));
