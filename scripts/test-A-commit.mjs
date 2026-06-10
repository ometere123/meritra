/**
 * Test A - Commit phase
 *   1. Create grant round.
 *   2. Open round.
 *   3. Applicant A commits a proposal hash.
 *   4. Confirm proposal content is NOT stored publicly at commit stage
 *      (on-chain record has no `title`, no `abstract`, only the hash).
 *   5. Confirm a different user cannot reveal the committed proposal_id.
 */
import { accounts, write, readJson, section, log, canonical, sha256hex, randomSalt,
  freshRoundPayload, PROPOSAL_TEMPLATES, assertEq, assertTrue, expectRevert } from "./e2e-lib.mjs";

section("TEST A - Commit phase");

// 1. Create round
const { round, rubric } = freshRoundPayload();
await write(accounts.creator.client, "create_round",
  [JSON.stringify(round), JSON.stringify(rubric)], "creator");
const stats = await readJson("get_protocol_stats", []);
const roundId = stats.last_round_id;
log(`  roundId=${roundId}`);

// 2. Open round
await write(accounts.creator.client, "open_round", [roundId], "creator");
const r = await readJson("get_round", [roundId]);
assertEq(r.status, "OPEN", "round.status after open");

// 3. Applicant A commits
const proposal = { ...PROPOSAL_TEMPLATES.A, applicantWallet: accounts.A.addr };
const canonStr = canonical(proposal);
const salt = randomSalt();
const hash = sha256hex(canonStr + salt);
await write(accounts.A.client, "submit_proposal_commitment", [roundId, hash], "applicantA");

const rprops = await readJson("get_round_proposals", [roundId]);
const proposalId = rprops[rprops.length - 1];
log(`  committed proposalId=${proposalId}`);

// 4. Public on-chain record contains the hash only, not the content
const p = await readJson("get_proposal", [proposalId]);
assertEq(p.status, "COMMITTED", "proposal.status at commit");
assertEq(p.revealed, false, "proposal.revealed at commit");
assertEq(p.commitment_hash, hash, "stored commitment_hash");
assertTrue(!p.title, "no title stored before reveal");
assertTrue(!p.abstract, "no abstract stored before reveal");
assertTrue(!p.budget_breakdown, "no budget_breakdown stored before reveal");
assertTrue(!p.public_summary, "no public_summary stored before reveal");

// 5. A different account cannot reveal this proposal_id
const err = await expectRevert(() =>
  write(accounts.B.client, "reveal_proposal", [proposalId, canonStr, salt], "applicantB(spoof)", { retries: 0 })
);
log(`  ✔ spoof reveal blocked: ${err.message.split("\n")[0].slice(0, 120)}`);

// 6. Even original applicant cannot reveal yet - round is still OPEN, not REVEAL_PHASE
const err2 = await expectRevert(() =>
  write(accounts.A.client, "reveal_proposal", [proposalId, canonStr, salt], "applicantA(early)", { retries: 0 })
);
log(`  ✔ early reveal blocked while OPEN: ${err2.message.split("\n")[0].slice(0, 120)}`);

section("TEST A PASSED");
// Export state for chaining suites
console.log("__STATE__" + JSON.stringify({ roundId, proposalId, canonStr, salt, hash, applicant: "A" }));
