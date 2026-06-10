/**
 * Meritra proposal lifecycle labels. Maps on-chain contract status strings into
 * the user-facing labels the product spec requires. Keep this as the single
 * source of truth so the UI never says "submitted for review" for a still-sealed
 * application.
 */
export type LifecycleLabel =
  | "Draft"
  | "Committed"
  | "Reveal Pending"
  | "Revealed"
  | "AI Consensus Review Pending"
  | "Reviewed / Scored"
  | "Ranked"
  | "Awarded"
  | "Rejected"
  | "Appealed"
  | "Escalated";

export function lifecycleLabel(opts: {
  status?: string;
  revealed?: boolean;
  roundStatus?: string;
  hasReview?: boolean;
  hasRanking?: boolean;
}): LifecycleLabel {
  const s = (opts.status || "").toUpperCase();
  // Draft state (proposal exists locally but not on-chain yet - used only by
  // the submit wizard before commitment).
  if (s === "DRAFT") return "Draft";

  // Sealed commitment phase
  if (s === "COMMITTED" || (opts.revealed === false && opts.roundStatus === "OPEN")) {
    return "Committed";
  }

  // After commitment phase closes but before this applicant has revealed.
  if (opts.revealed === false && (opts.roundStatus === "REVEAL_PHASE" || opts.roundStatus === "CLOSED")) {
    return "Reveal Pending";
  }

  // Revealed but consensus review not yet started.
  if ((s === "REVEALED" || opts.revealed === true) && !opts.hasReview) {
    if (opts.roundStatus === "REVIEWING") return "AI Consensus Review Pending";
    return "Revealed";
  }

  if (opts.hasReview && !opts.hasRanking) return "Reviewed / Scored";
  if (opts.hasRanking) return "Ranked";

  if (s === "RECOMMENDED_FOR_FUNDING" || s === "PARTIAL_FUNDING_RECOMMENDED" || s === "FUNDED") return "Awarded";
  if (s === "REJECTED" || s === "WAITLISTED" || s === "NEEDS_MORE_EVIDENCE") return "Rejected";
  if (s === "APPEALED") return "Appealed";
  if (s === "ESCALATED") return "Escalated";

  return "Committed";
}
