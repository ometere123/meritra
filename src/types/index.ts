export type ResearchArea =
  | "AI_RESEARCH" | "CLIMATE_RESEARCH" | "HEALTH_RESEARCH" | "EDUCATION_RESEARCH"
  | "ENGINEERING_RESEARCH" | "SOCIAL_SCIENCE" | "PUBLIC_POLICY"
  | "OPEN_SOURCE_RESEARCH" | "ECONOMICS" | "ENERGY_RESEARCH" | "AGRICULTURE"
  | "HUMANITIES" | "INTERDISCIPLINARY" | "OTHER";

export type RoundStatus =
  | "DRAFT" | "OPEN" | "CLOSED" | "UNDER_REVIEW" | "RANKED"
  | "AWARDS_ASSIGNED" | "APPEALS_OPEN" | "FINALIZED" | "ARCHIVED";

export type ProposalVerdict =
  | "RECOMMENDED_FOR_FUNDING" | "PARTIAL_FUNDING_RECOMMENDED" | "WAITLISTED"
  | "REJECTED" | "NEEDS_MORE_EVIDENCE" | "ESCALATE";

export type FundingSuitability =
  | "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW" | "NOT_SUITABLE" | "UNCLEAR";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type PlagiarismRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ProposalStatus =
  | "DRAFT" | "SUBMITTED" | "EVIDENCE_PENDING" | "UNDER_CONSENSUS_REVIEW"
  | "RECOMMENDED_FOR_FUNDING" | "PARTIAL_FUNDING_RECOMMENDED" | "WAITLISTED"
  | "REJECTED" | "NEEDS_MORE_EVIDENCE" | "ESCALATED" | "APPEALED"
  | "MILESTONE_ACTIVE" | "FINALIZED";

export type EvidencePrivacy = "PUBLIC" | "REDACTED" | "PRIVATE_HASH_ONLY";

export type RubricCategory =
  | "RESEARCH_RELEVANCE" | "ORIGINALITY" | "METHODOLOGY_QUALITY" | "FEASIBILITY"
  | "EXPECTED_IMPACT" | "APPLICANT_CAPABILITY" | "BUDGET_REASONABLENESS"
  | "MILESTONE_CLARITY" | "ETHICS_AND_RISK" | "EVIDENCE_STRENGTH";

export type RubricItem = {
  id: string;
  category: RubricCategory;
  weight: number;
  description: string;
  strongEvidenceDefinition: string;
  weakEvidenceDefinition: string;
  disqualifyingRedFlags?: string[];
  minimumStandard?: string;
};

export type ResearchGrantRound = {
  id: string;
  title: string;
  fundingOrganisation: string;
  researchArea: ResearchArea;
  researchTheme: string;
  description: string;
  eligibilityCriteria: string;
  evaluationRubric: RubricItem[];
  fundingPool?: number;
  currency?: string;
  maxAwardPerProposal?: number;
  expectedAwardCount?: number;
  applicationOpenDate: string;
  applicationDeadline: string;
  reviewDeadline?: string;
  requiredEvidenceTypes: string[];
  ethicsRequirements?: string;
  impactRequirements?: string;
  budgetRules?: string;
  milestoneRules?: string;
  appealRules?: string;
  status: RoundStatus;
  createdAt: number;
  updatedAt: number;
};

export type ResearchProposal = {
  id: string;
  roundId: string;
  applicantWallet: string;
  applicantNameOrOrg: string;
  researchTitle: string;
  abstract: string;
  researchQuestion: string;
  problemStatement: string;
  literatureContext: string;
  methodology: string;
  expectedContribution: string;
  timeline: string;
  requestedAmount?: number;
  currency?: string;
  budgetBreakdown: string;
  milestones: string;
  impactClaims: string;
  ethicsConsiderations?: string;
  applicantBackground: string;
  priorWork: string;
  collaborators?: string[];
  conflictDisclosures?: string;
  status: ProposalStatus;
  createdAt: number;
  updatedAt: number;
};

export type ProposalEvidence = {
  id: string;
  proposalId: string;
  type: string;
  title: string;
  description: string;
  uri: string;
  hash?: string;
  source?: string;
  date?: string;
  relevanceNote: string;
  privacy: EvidencePrivacy;
};

export type ProposalReview = {
  proposal_id: string;
  verdict: ProposalVerdict;
  funding_suitability: FundingSuitability;
  merit_score: number;
  confidence: number;
  risk_level: RiskLevel;
  recommended_funding_amount?: number;
  requested_amount?: number;
  currency?: string;
  research_relevance: { score: number; reason: string };
  originality: { score: number; plagiarism_risk: PlagiarismRisk; reason: string };
  methodology_quality: { score: number; reason: string };
  feasibility: { score: number; reason: string };
  expected_impact: { score: number; reason: string };
  budget_reasonableness: { score: number; reason: string };
  ethics_and_risk: { score: number; reason: string };
  positive_signals: string[];
  red_flags: string[];
  missing_information: string[];
  recommended_action: string;
  reasoning_summary: string;
};

export type RankedProposal = {
  proposal_id: string;
  rank: number;
  merit_score: number;
  recommended_funding?: number;
  decision: ProposalVerdict;
  reason: string;
};

export type RoundRanking = {
  round_id: string;
  ranking_status: "RANKED" | "PARTIALLY_RANKED" | "NEEDS_MORE_EVIDENCE" | "ESCALATE";
  total_proposals_reviewed: number;
  ranking_confidence: number;
  ranked_proposals: RankedProposal[];
  funding_summary?: { total_pool: number; total_recommended: number; currency: string };
  round_findings: string[];
  tie_breaks: string[];
  red_flags: string[];
  reasoning_summary: string;
};
