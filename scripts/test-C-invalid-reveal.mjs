/**
 * Test C - Invalid reveal
 *   1. Commit proposal A.
 *   2. close_round.
 *   3. Try to reveal a DIFFERENT proposal JSON for the same proposal_id.
 *      Expect on-chain revert ("hash mismatch").
 *   4. Try to reveal with the wrong salt. Expect on-chain revert.
 *   5. Then reveal correctly and confirm it accepts.
 */
import { accounts, write, readJson, section, log, canonical, sha256hex, randomSalt,
  freshRoundPayload, PROPOSAL_TEMPLATES, assertEq, expectRevert } from "./e2e-lib.mjs";

section("TEST C - Invalid reveal");

const { round, rubric } = freshRoundPayload();
await write(accounts.creator.client, "create_round",
  [JSON.stringify(round), JSON.stringify(rubric)], "creator");
const stats = await readJson("get_protocol_stats", []);
const roundId = stats.last_round_id;
await write(accounts.creator.client, "open_round", [roundId], "creator");

// 1. Commit proposal A
const propA = { ...PROPOSAL_TEMPLATES.A, applicantWallet: accounts.A.addr };
const canonA = canonical(propA);
const saltA = randomSalt();
const hashA = sha256hex(canonA + saltA);
await write(accounts.A.client, "submit_proposal_commitment", [roundId, hashA], "applicantA");

const rprops = await readJson("get_round_proposals", [roundId]);
const proposalId = rprops[rprops.length - 1];

await write(accounts.creator.client, "close_round", [roundId], "creator");

// 2. Try to reveal a DIFFERENT proposal (use B's payload)
const propB = { ...PROPOSAL_TEMPLATES.B, applicantWallet: accounts.A.addr };
const canonB = canonical(propB);
const err1 = await expectRevert(() =>
  write(accounts.A.client, "reveal_proposal", [proposalId, canonB, saltA], "applicantA(wrong-content)", { retries: 0 })
);
log(`  ✔ wrong content rejected: ${err1.message.split("\n")[0].slice(0, 140)}`);

// 3. Try to reveal with wrong salt
const wrongSalt = randomSalt();
const err2 = await expectRevert(() =>
  write(accounts.A.client, "reveal_proposal", [proposalId, canonA, wrongSalt], "applicantA(wrong-salt)", { retries: 0 })
);
log(`  ✔ wrong salt rejected: ${err2.message.split("\n")[0].slice(0, 140)}`);

// 4. Now reveal correctly - must succeed
await write(accounts.A.client, "reveal_proposal", [proposalId, canonA, saltA], "applicantA(valid)");
const p = await readJson("get_proposal", [proposalId]);
assertEq(p.status, "REVEALED", "valid reveal accepted");
assertEq(p.title, propA.title, "valid reveal content stored");

section("TEST C PASSED");
console.log("__STATE__" + JSON.stringify({ roundId, proposalId }));
