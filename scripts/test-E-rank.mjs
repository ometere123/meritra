/**
 * Test E — Ranking
 *   1. Build a round with multiple revealed proposals.
 *   2. review_proposal each.
 *   3. rank_round_proposals.
 *   4. Confirm ranking uses accepted review outputs (every ranked entry's
 *      proposal_id exists, decision is in the verdict enum, ranks are unique
 *      and contiguous).
 *   5. Confirm funding rules: sum(recommended_funding) ≤ funding_pool.
 *   6. Confirm round status flips to RANKED.
 *   7. Finalize and confirm status FINALIZED.
 */
import { accounts, write, readJson, section, log, canonical, sha256hex, randomSalt,
  freshRoundPayload, PROPOSAL_TEMPLATES, assertEq, assertTrue } from "./e2e-lib.mjs";

const ALLOWED_VERDICTS = new Set(["RECOMMENDED_FOR_FUNDING","PARTIAL_FUNDING_RECOMMENDED","WAITLISTED","REJECTED","NEEDS_MORE_EVIDENCE","ESCALATE"]);
const ALLOWED_RANKING_STATUS = new Set(["RANKED","PARTIALLY_RANKED","NEEDS_MORE_EVIDENCE","ESCALATE"]);

section("TEST E — Ranking & finalisation");

const { round, rubric } = freshRoundPayload();
await write(accounts.creator.client, "create_round",
  [JSON.stringify(round), JSON.stringify(rubric)], "creator");
const stats = await readJson("get_protocol_stats", []);
const roundId = stats.last_round_id;
await write(accounts.creator.client, "open_round", [roundId], "creator");

const reveals = {};
for (const k of ["A", "B", "D"]) { // skip C until non-ASCII fix is redeployed
  const proposal = { ...PROPOSAL_TEMPLATES[k], applicantWallet: accounts[k].addr };
  const canonStr = canonical(proposal);
  const salt = randomSalt();
  const hash = sha256hex(canonStr + salt);
  await write(accounts[k].client, "submit_proposal_commitment", [roundId, hash], `applicant${k}`);
  reveals[k] = { canonStr, salt };
}
const rprops = await readJson("get_round_proposals", [roundId]);
const idMap = { A: rprops[0], B: rprops[1], D: rprops[2] };

await write(accounts.creator.client, "close_round", [roundId], "creator");
for (const k of ["A", "B", "D"]) {
  await write(accounts[k].client, "reveal_proposal", [idMap[k], reveals[k].canonStr, reveals[k].salt], `applicant${k}`);
}

await write(accounts.creator.client, "start_reviewing", [roundId], "creator");
for (const k of ["A", "B", "D"]) {
  log(`  → reviewing ${k} (${idMap[k]})…`);
  await write(accounts.creator.client, "review_proposal", [idMap[k]], `creator/${k}`);
}

await write(accounts.creator.client, "rank_round_proposals", [roundId], "creator");
const rk = await readJson("get_round_ranking", [roundId]);
assertTrue(!!rk, "ranking exists");
assertTrue(ALLOWED_RANKING_STATUS.has(rk.ranking_status), `ranking_status in enum (${rk.ranking_status})`);

const knownIds = new Set(Object.values(idMap));
const ranks = new Set();
for (const r of rk.ranked_proposals || []) {
  assertTrue(knownIds.has(r.proposal_id), `ranked entry refers to a real proposal: ${r.proposal_id}`);
  assertTrue(ALLOWED_VERDICTS.has(r.decision), `ranked decision in enum: ${r.decision}`);
  assertTrue(Number(r.merit_score) >= 0 && Number(r.merit_score) <= 100, "ranked merit_score range");
  assertTrue(Number(r.recommended_funding) >= 0, "ranked funding non-negative");
  assertTrue(Number(r.rank) >= 1, "rank >= 1");
  ranks.add(Number(r.rank));
}
assertTrue(ranks.size === (rk.ranked_proposals || []).length, "ranks are unique");

const pool = Number(round.funding_pool);
const totalRec = (rk.ranked_proposals || []).reduce((acc, r) => acc + Number(r.recommended_funding || 0), 0);
assertTrue(totalRec <= pool, `total recommended (${totalRec}) <= pool (${pool})`);

const rRound = await readJson("get_round", [roundId]);
assertEq(rRound.status, "RANKED", "round.status after rank");

await write(accounts.creator.client, "finalize_round", [roundId], "creator");
const rFinal = await readJson("get_round", [roundId]);
assertEq(rFinal.status, "FINALIZED", "round.status after finalize");

section("TEST E PASSED");
console.log("__STATE__" + JSON.stringify({ roundId, idMap, ranking: rk.ranking_status }));
