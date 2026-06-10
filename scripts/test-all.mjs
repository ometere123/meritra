/**
 * Meritra full e2e — runs suites in the order from the spec:
 *   0. Connect + read contract basic state
 *   A. Commit phase
 *   B. Reveal phase
 *   C. Invalid reveal
 *   D. Nondet scoring (review_proposal — uses prompt_non_comparative)
 *   E. Ranking + finalisation
 *   F. Milestone + appeal (both nondet)
 *
 * Exit non-zero on any suite failure. Each suite creates its own round so
 * failures in one suite don't poison the rest.
 */
import { spawn } from "node:child_process";
import { accounts, readClient, CONTRACT, readJson, section, log } from "./e2e-lib.mjs";

const SUITES = [
  ["A", "scripts/test-A-commit.mjs"],
  ["B", "scripts/test-B-reveal.mjs"],
  ["C", "scripts/test-C-invalid-reveal.mjs"],
  ["D", "scripts/test-D-review.mjs"],
  ["E", "scripts/test-E-rank.mjs"],
  ["F", "scripts/test-F-milestone-appeal.mjs"],
];

function run(suite, path) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn("node", [path], { stdio: "inherit" });
    child.on("exit", (code) => resolve({ suite, code, ms: Date.now() - t0 }));
  });
}

async function main() {
  section("STEP 0 — Connect + read basic state");
  log(`  contract: ${CONTRACT}`);
  for (const [k, v] of Object.entries(accounts)) {
    const bal = await readClient.getBalance({ address: v.addr });
    log(`  ${k.padEnd(8)} ${v.addr}  ${Number(bal) / 1e18} GEN`);
  }
  const stats = await readJson("get_protocol_stats", []);
  log("  protocol_stats:", stats);

  const include = process.argv.slice(2);
  const filtered = include.length ? SUITES.filter(([k]) => include.includes(k)) : SUITES;

  const results = [];
  for (const [k, path] of filtered) {
    const r = await run(k, path);
    results.push(r);
    if (r.code !== 0) {
      log(`\n✗ Suite ${k} FAILED (exit ${r.code}). Stopping.`);
      break;
    }
  }
  section("SUMMARY");
  for (const r of results) {
    log(`  ${r.code === 0 ? "✓" : "✗"} Suite ${r.suite}  (${(r.ms / 1000).toFixed(1)}s)`);
  }
  const failed = results.find((r) => r.code !== 0);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
