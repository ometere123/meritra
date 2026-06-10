/**
 * Shared helpers for Meritra e2e suites. Each test file imports from here.
 * All writes go through genlayer-js createClient + viem privateKeyToAccount.
 */
import crypto from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const RPC = process.env.MERITRA_RPC || "https://studio.genlayer.com/api";
export const CONTRACT =
  process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS ||
  "0x4033543ED5997EA9da38f4562d67acF114b34b41"; // overridden by env after redeploy

/**
 * Test wallet keys. NEVER commit real private keys to this file. Supply five
 * throwaway funded Studionet keys via env vars before running any suite:
 *
 *   MERITRA_CREATOR_PK     0x… (round creator)
 *   MERITRA_APPLICANT_A_PK 0x… (applicant)
 *   MERITRA_APPLICANT_B_PK 0x… (applicant)
 *   MERITRA_APPLICANT_C_PK 0x… (applicant)
 *   MERITRA_APPLICANT_D_PK 0x… (applicant)
 */
function requireKey(name) {
  const v = process.env[name];
  if (!v || !v.startsWith("0x")) {
    throw new Error(`Missing required env var ${name} (throwaway Studionet private key, 0x-prefixed).`);
  }
  return v;
}
export const KEYS = {
  creator: requireKey("MERITRA_CREATOR_PK"),
  A: requireKey("MERITRA_APPLICANT_A_PK"),
  B: requireKey("MERITRA_APPLICANT_B_PK"),
  C: requireKey("MERITRA_APPLICANT_C_PK"),
  D: requireKey("MERITRA_APPLICANT_D_PK"),
};

export const readClient = createClient({ chain: studionet, endpoint: RPC });
export const signer = (pk) =>
  createClient({ chain: studionet, endpoint: RPC, account: privateKeyToAccount(pk) });

export const accounts = Object.fromEntries(
  Object.entries(KEYS).map(([k, pk]) => [k, { pk, client: signer(pk), addr: privateKeyToAccount(pk).address }])
);

export const log = (...a) => console.log(...a);
export const section = (t) => log(`\n=== ${t} ===`);

// Canonical JSON — matches the contract's _canonical_proposal_json (sorted
// keys, no whitespace, ensure_ascii=False).
export function canonical(obj) {
  const sort = (v) => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") {
      const out = {};
      for (const k of Object.keys(v).sort()) out[k] = sort(v[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(sort(obj));
}

export function sha256hex(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

export function randomSalt(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

async function writeOnce(client, fn, args, label) {
  log(`  → ${label} ${fn}(${args.map((a) => typeof a === "string" && a.length > 20 ? a.slice(0, 14) + "…" : JSON.stringify(a)).join(", ")})`);
  const t0 = Date.now();
  const tx = await client.writeContract({
    address: CONTRACT,
    functionName: fn,
    args,
    value: 0n,
  });
  const hash = typeof tx === "string" ? tx : tx?.hash || tx;
  try { await client.waitForTransactionReceipt?.({ hash, retries: 200, interval: 3000 }); } catch (e) { log(`    ! wait: ${e.message}`); }
  try {
    const receipt = await client.getTransaction({ hash });
    const cd = receipt?.consensus_data;
    const execResult = cd?.leader_receipt?.[0]?.execution_result || cd?.validators?.[0]?.execution_result;
    if (execResult && execResult !== "SUCCESS" && execResult !== "ACCEPTED") {
      const stderr = cd?.leader_receipt?.[0]?.stderr || cd?.validators?.[0]?.stderr || "";
      const lastLine = stderr.trim().split("\n").slice(-2).join(" | ");
      throw new Error(`${fn} on-chain ${execResult}: ${lastLine || "(no stderr)"}`);
    }
  } catch (e) {
    if (e.message?.includes("on-chain")) throw e;
    log(`    ! receipt inspect: ${e.message}`);
  }
  log(`    ✓ ${fn} (${Date.now() - t0}ms) tx=${hash}`);
  return hash;
}

export async function write(client, fn, args, label, { retries = 3 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try { return await writeOnce(client, fn, args, label); }
    catch (e) {
      lastErr = e;
      if (i < retries) { log(`    ! ${fn} attempt ${i + 1} failed: ${e.message} — retrying`); await new Promise(r => setTimeout(r, 5000)); }
    }
  }
  throw lastErr;
}

export async function readJson(fn, args) {
  const raw = await readClient.readContract({ address: CONTRACT, functionName: fn, args });
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

export async function expectRevert(fn) {
  try { await fn(); }
  catch (e) { return e; }
  throw new Error("Expected on-chain revert, but call succeeded");
}

export function assertEq(actual, expected, label) {
  const a = JSON.stringify(actual); const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`Assertion failed [${label}]: got ${a}, expected ${b}`);
  log(`  ✔ ${label} = ${a}`);
}

export function assertTrue(cond, label) {
  if (!cond) throw new Error(`Assertion failed [${label}]: expected truthy`);
  log(`  ✔ ${label}`);
}

// Standard valid round payload + rubric — used by every suite that needs a
// round. Deadlines computed from now so the round is in its open window.
export function freshRoundPayload(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;
  return {
    round: {
      title: "Meritra e2e — auto round",
      description: "Automated e2e suite round.",
      funding_pool: 60000,
      currency: "USD",
      application_start: now - 60,
      application_deadline: now + 30 * 60,
      reveal_deadline: now + day,
      review_deadline: now + 2 * day,
      appeal_deadline: now + 3 * day,
      milestone_policy: "n/a",
      visibility: "PUBLIC",
      fundingOrganisation: "Meridian Foundation",
      researchArea: "CLIMATE_RESEARCH",
      researchTheme: "Auto-test",
      eligibilityCriteria: "Open.",
      ...overrides.round,
    },
    rubric: {
      // Contract validates rubric_json with _json_load (object). Wrap items.
      items: overrides.rubricItems || [
        { id: "r1", category: "RESEARCH_RELEVANCE", weight: 20, description: "Aligns with round goals." },
        { id: "r2", category: "METHODOLOGY_QUALITY", weight: 20, description: "Sound design." },
        { id: "r3", category: "FEASIBILITY", weight: 20, description: "Realistic plan." },
        { id: "r4", category: "EXPECTED_IMPACT", weight: 20, description: "Credible impact." },
        { id: "r5", category: "BUDGET_REASONABLENESS", weight: 20, description: "Costs justified." },
      ],
    },
  };
}

// Standard ASCII-only proposal payloads. Avoid non-ASCII characters in any
// payload that needs to round-trip through json.dumps recanonicalisation if
// the deployed contract still has ensure_ascii=True (older deploys).
export const PROPOSAL_TEMPLATES = {
  A: {
    title: "Drought-resilient maize trial in semi-arid Kenya",
    public_summary: "12-month pilot trial of drought-tolerant maize cultivars across 4 districts.",
    category: "AGRICULTURE",
    requested_amount: 14000, currency: "USD",
    abstract: "We evaluate three cultivars against a control with farmer co-design.",
    research_question: "Which drought-tolerant maize variety yields best under semi-arid stress?",
    methodology: "Randomised plot trial, 4 sites, 3 replicates, soil moisture instrumentation.",
    timeline: "Months 1-2 setup; 3-9 trial; 10-12 analysis.",
    budget_breakdown: "Seed 3k, instrumentation 4k, fieldwork 5k, analysis 2k.",
    impact_claims: "Could lift smallholder yields 15-25% in trial districts.",
    ethics_considerations: "Farmer consent forms, fair benefit-sharing.",
    applicant_background: "Agronomy MSc, 4 prior field trials.",
    evidence_summary: "Pilot data 2023 attached.",
  },
  B: {
    title: "Coastal flood early-warning ML model for the Mekong delta",
    public_summary: "Train an ML nowcasting model for daily flood risk in 3 provinces.",
    category: "CLIMATE_RESEARCH",
    requested_amount: 18000, currency: "USD",
    abstract: "Use SAR + tide gauge data to predict 24-72h flood probability.",
    research_question: "Can SAR fusion improve flood nowcasting accuracy over operational baselines?",
    methodology: "Train XGBoost + lightweight transformer on 5 yrs of labelled events.",
    timeline: "9 months: data 1-3, model 4-7, validation 8-9.",
    budget_breakdown: "Compute 5k, data licensing 4k, salary 7k, dissemination 2k.",
    impact_claims: "Could give local DRR offices 24h extra lead time.",
    ethics_considerations: "No personal data; open-source model.",
    applicant_background: "PhD candidate, 3 publications in flood modelling.",
    evidence_summary: "Github + preprint linked.",
  },
  C: {
    title: "Low-cost soil carbon sensor for smallholder MRV",
    public_summary: "Prototype an open-hardware soil carbon sensor under $50.",
    category: "ENGINEERING_RESEARCH",
    requested_amount: 9000, currency: "USD",
    abstract: "Spectroscopy-based handheld sensor with smartphone app.",
    research_question: "Can a sub-$50 sensor reach +/-15% lab calibration accuracy?", // ASCII only
    methodology: "Hardware prototype + 200-sample calibration against lab reference.",
    timeline: "6 months: design 1-2, build 3-4, calibrate 5-6.",
    budget_breakdown: "Components 4k, lab analysis 3k, travel 2k.",
    impact_claims: "Enables MRV at smallholder scale for carbon credit programmes.",
    ethics_considerations: "Hardware is open source under MIT.",
    applicant_background: "EE postgrad with 2 hardware patents.",
    evidence_summary: "Bench prototype photos and BOM attached.",
  },
  D: {
    title: "Idea: write a blog about climate maybe",
    public_summary: "I want to write a blog and travel.",
    category: "OTHER",
    requested_amount: 25000, currency: "USD",
    abstract: "Blog about climate and travel a bit.",
    research_question: "Is climate bad? probably",
    methodology: "I will read some papers and write about them.",
    timeline: "When I feel like it.",
    budget_breakdown: "Travel 15k, laptop 5k, food 5k.",
    impact_claims: "People will read my blog and care.",
    ethics_considerations: "n/a",
    applicant_background: "I like writing.",
    evidence_summary: "None yet.",
  },
};
