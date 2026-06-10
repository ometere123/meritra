/**
 * Test B — Reveal phase
 *   Builds on a freshly committed round (creates its own state inline).
 *   1. Commit one proposal.
 *   2. close_round → REVEAL_PHASE.
 *   3. Reveal the correct proposal_json + salt.
 *   4. Verify proposal is now publicly available (title + content readable).
 *   5. Verify proposal.revealed=true and status REVEALED.
 */
import { accounts, write, readJson, section, log, canonical, sha256hex, randomSalt,
  freshRoundPayload, PROPOSAL_TEMPLATES, assertEq, assertTrue } from "./e2e-lib.mjs";

section("TEST B — Reveal phase");

const { round, rubric } = freshRoundPayload();
await write(accounts.creator.client, "create_round",
  [JSON.stringify(round), JSON.stringify(rubric)], "creator");
const stats = await readJson("get_protocol_stats", []);
const roundId = stats.last_round_id;
await write(accounts.creator.client, "open_round", [roundId], "creator");

const proposal = { ...PROPOSAL_TEMPLATES.B, applicantWallet: accounts.B.addr };
const canonStr = canonical(proposal);
const salt = randomSalt();
const hash = sha256hex(canonStr + salt);
await write(accounts.B.client, "submit_proposal_commitment", [roundId, hash], "applicantB");

const rprops = await readJson("get_round_proposals", [roundId]);
const proposalId = rprops[rprops.length - 1];

// 2. close → REVEAL_PHASE
await write(accounts.creator.client, "close_round", [roundId], "creator");
const r2 = await readJson("get_round", [roundId]);
assertEq(r2.status, "REVEAL_PHASE", "round.status after close");

// 3. Reveal
await write(accounts.B.client, "reveal_proposal", [proposalId, canonStr, salt], "applicantB");

// 4. Public read returns proposal content
const p = await readJson("get_proposal", [proposalId]);
assertEq(p.status, "REVEALED", "proposal.status after reveal");
assertEq(p.revealed, true, "proposal.revealed");
assertEq(p.title, proposal.title, "title now public");
assertTrue(p.abstract && p.abstract.length > 0, "abstract now public");
assertTrue(p.commitment_hash === hash, "commitment_hash preserved");

section("TEST B PASSED");
console.log("__STATE__" + JSON.stringify({ roundId, proposalId }));
