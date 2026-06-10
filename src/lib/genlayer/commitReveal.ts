"use client";

/**
 * Commit-reveal helpers for Meritra applications.
 *
 * The applicant builds a canonical proposal JSON, generates a random salt
 * locally, computes sha256(canonical + salt) in the browser, and submits ONLY
 * that hash to the contract. The reveal payload (proposal_json + salt) is
 * stored ONLY on the applicant's device until they reveal.
 *
 * If the applicant loses the salt or proposal JSON, they cannot reveal.
 */

const STORAGE_KEY = "meritra.pendingReveals.v1";

export type PendingReveal = {
  roundId: string;
  proposalId: string;
  applicantWallet: string;
  commitmentHash: string;
  canonicalJson: string;
  salt: string;
  createdAt: number;
  // Original form fields, for the reveal dashboard preview.
  preview: {
    title: string;
    public_summary?: string;
    requested_amount?: number;
    currency?: string;
  };
};

/** Deterministic canonical JSON: sorted keys, no whitespace. Mirrors the contract. */
export function canonicalProposalJson(obj: Record<string, unknown>): string {
  const sort = (v: any): any => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") {
      const out: Record<string, any> = {};
      for (const k of Object.keys(v).sort()) out[k] = sort(v[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(sort(obj));
}

export function generateSalt(bytes = 32): string {
  if (typeof window === "undefined") throw new Error("Salt must be generated client-side.");
  const buf = new Uint8Array(bytes);
  window.crypto.getRandomValues(buf);
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function commitmentHash(canonicalJson: string, salt: string): Promise<string> {
  if (typeof window === "undefined") throw new Error("Hashing must run client-side.");
  const enc = new TextEncoder().encode(canonicalJson + salt);
  const digest = await window.crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// --------------------------------------------------------------------------
// Local pending-reveal store. Lives in localStorage so applicants can recover
// across refreshes. Plain JSON — backup/download is offered via download button.
// --------------------------------------------------------------------------

function readStore(): PendingReveal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingReveal[]) : [];
  } catch {
    return [];
  }
}

function writeStore(list: PendingReveal[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function savePendingReveal(item: PendingReveal) {
  const list = readStore().filter((p) => p.proposalId !== item.proposalId);
  list.push(item);
  writeStore(list);
}

export function listPendingReveals(wallet?: string): PendingReveal[] {
  const list = readStore();
  return wallet ? list.filter((p) => p.applicantWallet.toLowerCase() === wallet.toLowerCase()) : list;
}

export function getPendingReveal(proposalId: string): PendingReveal | undefined {
  return readStore().find((p) => p.proposalId === proposalId);
}

export function removePendingReveal(proposalId: string) {
  writeStore(readStore().filter((p) => p.proposalId !== proposalId));
}

/** Trigger a browser download of the reveal backup. */
export function downloadRevealBackup(item: PendingReveal) {
  if (typeof window === "undefined") return;
  const payload = {
    type: "meritra.reveal-backup",
    version: 1,
    ...item,
    warning:
      "If you lose this file you cannot reveal your sealed application. Keep it private until the reveal phase.",
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `meritra-reveal-${item.proposalId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
