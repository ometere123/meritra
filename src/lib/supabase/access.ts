import { supabase } from "./client";

export type AccessContext = {
  privyUserId: string;
  walletAddress: string;
};

export type AccessRole = "applicant" | "reviewer" | "grant_admin" | "protocol_admin";

export async function getAccessContext() {
  return {
    role: "applicant" as AccessRole,
    isGrantCreator: false,
    isGrantAdmin: false,
    isReviewerAssigned: false,
    isProtocolAdmin: false,
  };
}

export async function canSubmitToGrant(_roundId: string, _context: AccessContext) {
  return true;
}

export async function canViewProposal(_proposalId: string, _context: AccessContext) {
  return true;
}

export async function canViewRoundSubmissions(_roundId: string, _context: AccessContext) {
  return true;
}

export function hasSupabase() {
  return !!supabase;
}
