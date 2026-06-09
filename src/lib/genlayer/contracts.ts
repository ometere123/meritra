"use client";

import { getReadClient, getWriteClient, getContractAddress } from "./client";
import { isContractConfigured } from "./config";

export class ContractNotConfiguredError extends Error {
  constructor() {
    super("GenLayer contract not configured");
  }
}

async function readContract(method: string, args: any[] = []): Promise<string> {
  if (!isContractConfigured()) throw new ContractNotConfiguredError();
  const client = getReadClient();
  const res = await (client as any).readContract({
    address: getContractAddress(),
    functionName: method,
    args,
  });
  return typeof res === "string" ? res : JSON.stringify(res);
}

async function writeContract(method: string, args: any[] = []): Promise<string> {
  if (!isContractConfigured()) throw new ContractNotConfiguredError();
  const client = await getWriteClient();
  const hash = await (client as any).writeContract({
    address: getContractAddress(),
    functionName: method,
    args,
    value: 0n,
  });
  await (client as any).waitForTransactionReceipt?.({ hash });
  return hash;
}

// ---------- writes
export const createRound = (roundJson: string, rubricJson: string) =>
  writeContract("create_round", [roundJson, rubricJson]);

export const openRound = (roundId: string) => writeContract("open_round", [roundId]);

export const updateRound = (id: string, roundJson: string, rubricJson: string) =>
  writeContract("update_round", [id, roundJson, rubricJson]);

export const submitProposal = (roundId: string, proposalJson: string) =>
  writeContract("submit_proposal", [roundId, proposalJson]);

export const addEvidence = (id: string, proposalId: string, evidenceJson: string) =>
  writeContract("add_evidence", [id, proposalId, evidenceJson]);

export const closeRound = (id: string) => writeContract("close_round", [id]);

export const startReviewing = (id: string) => writeContract("start_reviewing", [id]);

export const openAppeal = (id: string, proposalId: string, json: string) =>
  writeContract("open_appeal", [id, proposalId, json]);

export const submitMilestone = (id: string, proposalId: string, json: string) =>
  writeContract("submit_milestone", [id, proposalId, json]);

export const finalizeRound = (id: string) => writeContract("finalize_round", [id]);

export const reviewProposal = (id: string) => writeContract("review_proposal", [id]);

export const rankRoundProposals = (id: string) =>
  writeContract("rank_round_proposals", [id]);

export const detectSimilarity = (a: string, b: string) =>
  writeContract("detect_proposal_similarity", [a, b]);

export const reviewAppeal = (id: string) => writeContract("review_appeal", [id]);

export const reviewMilestone = (id: string) => writeContract("review_milestone", [id]);

// ---------- reads
const safeParse = <T,>(s: string, fallback: T): T => {
  try {
    if (!s) return fallback;
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
};

export async function getRound(id: string) {
  const raw = await readContract("get_round", [id]);
  return safeParse<any | null>(raw, null);
}

export async function getRubric(id: string) {
  const raw = await readContract("get_rubric", [id]);
  return safeParse<any[]>(raw, []);
}

export async function getProposal(id: string) {
  const raw = await readContract("get_proposal", [id]);
  return safeParse<any | null>(raw, null);
}

export async function getProposalEvidence(id: string) {
  const raw = await readContract("get_proposal_evidence", [id]);
  return safeParse<any[]>(raw, []);
}

export async function getProposalReview(id: string) {
  const raw = await readContract("get_proposal_review", [id]);
  return safeParse<any | null>(raw, null);
}

export async function getRoundRanking(id: string) {
  const raw = await readContract("get_round_ranking", [id]);
  return safeParse<any | null>(raw, null);
}

export async function getAppeal(id: string) {
  const raw = await readContract("get_appeal", [id]);
  return safeParse<any | null>(raw, null);
}

export async function getAppealReview(id: string) {
  const raw = await readContract("get_appeal_review", [id]);
  return safeParse<any | null>(raw, null);
}

export async function getMilestone(id: string) {
  const raw = await readContract("get_milestone", [id]);
  return safeParse<any | null>(raw, null);
}

export async function getMilestoneReview(id: string) {
  const raw = await readContract("get_milestone_review", [id]);
  return safeParse<any | null>(raw, null);
}

export async function getRoundProposals(id: string): Promise<string[]> {
  const raw = await readContract("get_round_proposals", [id]);
  return safeParse<string[]>(raw, []);
}

export async function getUserProposals(user: string): Promise<string[]> {
  const raw = await readContract("get_user_proposals", [user]);
  return safeParse<string[]>(raw, []);
}

export async function getAllRounds(): Promise<{ id: string; data: any }[]> {
  const raw = await readContract("get_all_rounds", []);
  const arr = safeParse<{ id: string; data: string }[]>(raw, []);
  return arr.map((r) => ({ id: r.id, data: safeParse<any>(r.data as any, null) }));
}

export async function getProtocolStats() {
  const raw = await readContract("get_protocol_stats", []);
  return safeParse<any>(raw, {
    round_count: 0,
    proposal_count: 0,
    evidence_count: 0,
    review_count: 0,
    ranking_count: 0,
    appeal_count: 0,
    milestone_count: 0,
  });
}

async function getLatestRoundIds(): Promise<Set<string>> {
  const rounds = await getAllRounds();
  return new Set(rounds.map((r) => r.id));
}

async function resolveCreatedRoundId(before: Set<string>): Promise<string> {
  const after = await getLatestRoundIds();
  for (const id of after) {
    if (!before.has(id)) return id;
  }
  const fallback = [...after].at(-1);
  if (!fallback) throw new Error("Unable to resolve contract-generated round ID.");
  return fallback;
}

export async function createRoundWithId(roundJson: string, rubricJson: string) {
  const before = await getLatestRoundIds();
  const result = await createRound(roundJson, rubricJson);
  const roundId = await resolveCreatedRoundId(before);
  return { txHash: result, roundId };
}

export async function submitProposalWithId(roundId: string, proposalJson: string) {
  const before = new Set(await getRoundProposals(roundId));
  const result = await submitProposal(roundId, proposalJson);
  const after = await getRoundProposals(roundId);
  const proposalId = after.find((id) => !before.has(id)) || after.at(-1);
  if (!proposalId) throw new Error("Unable to resolve contract-generated proposal ID.");
  return { txHash: result, proposalId };
}
