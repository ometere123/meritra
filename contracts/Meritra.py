# v0.2.17
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json


ALLOWED_ROUND_STATUS = {
    "DRAFT",
    "OPEN",
    "CLOSED",
    "REVIEWING",
    "RANKED",
    "FINALIZED",
    "ARCHIVED",
}

ALLOWED_PROPOSAL_STATUS = {
    "SUBMITTED",
    "UNDER_REVIEW",
    "RECOMMENDED_FOR_FUNDING",
    "PARTIAL_FUNDING_RECOMMENDED",
    "WAITLISTED",
    "REJECTED",
    "NEEDS_MORE_EVIDENCE",
    "ESCALATED",
    "APPEALED",
    "FUNDED",
}

ALLOWED_VERDICTS = {
    "RECOMMENDED_FOR_FUNDING",
    "PARTIAL_FUNDING_RECOMMENDED",
    "WAITLISTED",
    "REJECTED",
    "NEEDS_MORE_EVIDENCE",
    "ESCALATE",
}

ALLOWED_FUNDING_SUITABILITY = {
    "VERY_HIGH",
    "HIGH",
    "MODERATE",
    "LOW",
    "NOT_SUITABLE",
    "UNCLEAR",
}

ALLOWED_RISK = {
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
}

ALLOWED_PLAGIARISM = {
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
}

ALLOWED_RANKING_STATUS = {
    "RANKED",
    "PARTIALLY_RANKED",
    "NEEDS_MORE_EVIDENCE",
    "ESCALATE",
}

ALLOWED_APPEAL_DECISIONS = {
    "ORIGINAL_DECISION_UPHELD",
    "ORIGINAL_DECISION_ADJUSTED",
    "MORE_EVIDENCE_REQUIRED",
    "ESCALATE_TO_HUMAN_PANEL",
    "APPEAL_REJECTED",
}

ALLOWED_MILESTONE_DECISIONS = {
    "ACCEPTED",
    "PARTIALLY_ACCEPTED",
    "REJECTED",
    "NEEDS_MORE_EVIDENCE",
    "ESCALATE",
}

ALLOWED_SIMILARITY_VERDICTS = {
    "NO_SIGNIFICANT_SIMILARITY",
    "NORMAL_TEMPLATE_SIMILARITY",
    "POSSIBLE_DUPLICATE",
    "LIKELY_PLAGIARISED",
    "NEEDS_MANUAL_REVIEW",
}


class Meritra(gl.Contract):
    owner: Address

    round_count: u256
    proposal_count: u256
    evidence_count: u256
    review_count: u256
    ranking_count: u256
    appeal_count: u256
    milestone_count: u256
    similarity_count: u256

    rounds: TreeMap[str, str]
    round_rubrics: TreeMap[str, str]
    round_proposals: TreeMap[str, str]

    proposals: TreeMap[str, str]
    proposal_evidence: TreeMap[str, str]
    user_proposals: TreeMap[str, str]

    proposal_reviews: TreeMap[str, str]
    funding_recommendations: TreeMap[str, str]
    round_rankings: TreeMap[str, str]

    appeals: TreeMap[str, str]
    appeal_reviews: TreeMap[str, str]

    milestones: TreeMap[str, str]
    milestone_reviews: TreeMap[str, str]

    similarity_reviews: TreeMap[str, str]

    protocol_stats: TreeMap[str, str]

    def __init__(self) -> None:
        self.owner = gl.message.sender_address

        self.round_count = u256(0)
        self.proposal_count = u256(0)
        self.evidence_count = u256(0)
        self.review_count = u256(0)
        self.ranking_count = u256(0)
        self.appeal_count = u256(0)
        self.milestone_count = u256(0)
        self.similarity_count = u256(0)

    # -------------------------------------------------------------------------
    # Internal helpers
    # -------------------------------------------------------------------------

    def _sender(self) -> str:
        return str(gl.message.sender_address)

    def _is_protocol_owner(self) -> bool:
        return gl.message.sender_address == self.owner

    def _next_id(self, prefix: str, count_value: u256) -> str:
        return prefix + "_" + str(int(count_value) + 1)

    def _json_load(self, raw: str, label: str) -> dict:
        try:
            parsed = json.loads(raw)
        except Exception:
            raise VmUserError("Invalid JSON for " + label)

        if not isinstance(parsed, dict):
            raise VmUserError(label + " must be a JSON object")

        return parsed

    def _json_load_array(self, raw: str, label: str) -> list:
        try:
            parsed = json.loads(raw)
        except Exception:
            raise VmUserError("Invalid JSON for " + label)

        if not isinstance(parsed, list):
            raise VmUserError(label + " must be a JSON array")

        return parsed

    def _get_round(self, round_id: str) -> dict:
        if round_id not in self.rounds:
            raise VmUserError("Round does not exist")

        return json.loads(self.rounds[round_id])

    def _get_proposal(self, proposal_id: str) -> dict:
        if proposal_id not in self.proposals:
            raise VmUserError("Proposal does not exist")

        return json.loads(self.proposals[proposal_id])

    def _only_round_creator_or_protocol_owner(self, round_id: str) -> None:
        rnd = self._get_round(round_id)
        creator = str(rnd.get("creator", ""))

        if self._sender() != creator and not self._is_protocol_owner():
            raise VmUserError("Only round creator or protocol owner can perform this action")

    def _require_round_status(self, round_id: str, allowed: list) -> dict:
        rnd = self._get_round(round_id)
        status = str(rnd.get("status", ""))

        if status not in allowed:
            raise VmUserError("Round status does not allow this action")

        return rnd

    def _set_round_status(self, round_id: str, status: str) -> None:
        if status not in ALLOWED_ROUND_STATUS:
            raise VmUserError("Invalid round status")

        rnd = self._get_round(round_id)
        rnd["status"] = status
        self.rounds[round_id] = json.dumps(rnd)

    def _require_not_round_creator(self, round_id: str) -> None:
        rnd = self._get_round(round_id)
        creator = str(rnd.get("creator", ""))

        if self._sender() == creator:
            raise VmUserError("Grant creator cannot submit to their own grant round")

    def _safe_public_proposal(self, p: dict) -> dict:
        return {
            "title": str(p.get("title", "")),
            "public_summary": str(p.get("public_summary", "")),
            "category": str(p.get("category", "")),
            "requested_amount": p.get("requested_amount", 0),
            "currency": str(p.get("currency", "")),
            "content_hash": str(p.get("content_hash", "")),
            "content_cid": str(p.get("content_cid", "")),
            "evidence_summary": p.get("evidence_summary", []),
        }

    # -------------------------------------------------------------------------
    # Deterministic grant lifecycle
    # -------------------------------------------------------------------------

    @gl.public.write
    def create_round(self, round_json: str, rubric_json: str) -> str:
        """
        Creates a canonical grant round ID from the contract counter.

        round_json should contain public/sanitised grant data only:
        {
          "title": "...",
          "description": "...",
          "funding_pool": 10000,
          "currency": "USDC",
          "application_start": 0,
          "application_deadline": 0,
          "review_deadline": 0,
          "appeal_deadline": 0,
          "milestone_policy": "...",
          "visibility": "PUBLIC_SUMMARY_ONLY"
        }

        Timing values are stored as canonical round metadata.
        If GenLayer runtime timestamp is unavailable, the backend/orchestrator
        should call open_round/close_round at the correct time.
        """

        parsed_round = self._json_load(round_json, "round")
        parsed_rubric = self._json_load(rubric_json, "rubric")

        round_id = self._next_id("round", self.round_count)

        parsed_round["id"] = round_id
        parsed_round["creator"] = self._sender()
        parsed_round["status"] = "DRAFT"
        parsed_round["proposal_count"] = 0
        parsed_round["ranking_count"] = 0

        if "title" not in parsed_round or not str(parsed_round.get("title", "")).strip():
            raise VmUserError("Round title required")

        if "funding_pool" in parsed_round and float(parsed_round.get("funding_pool", 0)) < 0:
            raise VmUserError("Funding pool cannot be negative")

        self.rounds[round_id] = json.dumps(parsed_round)
        self.round_rubrics[round_id] = json.dumps(parsed_rubric)
        self.round_proposals[round_id] = json.dumps([])

        self.round_count = u256(int(self.round_count) + 1)

        self.protocol_stats["last_round_id"] = round_id

        return round_id

    @gl.public.write
    def update_round(self, round_id: str, round_json: str, rubric_json: str) -> None:
        self._only_round_creator_or_protocol_owner(round_id)

        current = self._get_round(round_id)
        status = str(current.get("status", ""))

        if status not in {"DRAFT", "OPEN"}:
            raise VmUserError("Cannot update round after it is closed/reviewing")

        parsed_round = self._json_load(round_json, "round")
        parsed_rubric = self._json_load(rubric_json, "rubric")

        parsed_round["id"] = round_id
        parsed_round["creator"] = current.get("creator", "")
        parsed_round["status"] = status
        parsed_round["proposal_count"] = current.get("proposal_count", 0)
        parsed_round["ranking_count"] = current.get("ranking_count", 0)

        self.rounds[round_id] = json.dumps(parsed_round)
        self.round_rubrics[round_id] = json.dumps(parsed_rubric)

    @gl.public.write
    def open_round(self, round_id: str) -> None:
        self._only_round_creator_or_protocol_owner(round_id)

        rnd = self._require_round_status(round_id, ["DRAFT"])
        rnd["status"] = "OPEN"
        self.rounds[round_id] = json.dumps(rnd)

    @gl.public.write
    def close_round(self, round_id: str) -> None:
        self._only_round_creator_or_protocol_owner(round_id)

        rnd = self._require_round_status(round_id, ["OPEN"])
        rnd["status"] = "CLOSED"
        self.rounds[round_id] = json.dumps(rnd)

    @gl.public.write
    def start_reviewing(self, round_id: str) -> None:
        self._only_round_creator_or_protocol_owner(round_id)

        rnd = self._require_round_status(round_id, ["CLOSED"])
        rnd["status"] = "REVIEWING"
        self.rounds[round_id] = json.dumps(rnd)

    @gl.public.write
    def finalize_round(self, round_id: str) -> None:
        self._only_round_creator_or_protocol_owner(round_id)

        rnd = self._require_round_status(round_id, ["RANKED"])
        rnd["status"] = "FINALIZED"
        self.rounds[round_id] = json.dumps(rnd)

    @gl.public.write
    def archive_round(self, round_id: str) -> None:
        self._only_round_creator_or_protocol_owner(round_id)

        rnd = self._get_round(round_id)
        rnd["status"] = "ARCHIVED"
        self.rounds[round_id] = json.dumps(rnd)

    # -------------------------------------------------------------------------
    # Proposal submission
    # -------------------------------------------------------------------------

    @gl.public.write
    def submit_proposal(self, round_id: str, proposal_json: str) -> str:
        """
        Contract generates proposal ID.

        proposal_json must be public/sanitised:
        {
          "title": "...",
          "public_summary": "...",
          "category": "...",
          "requested_amount": 1000,
          "currency": "USDC",
          "content_hash": "sha256/private_full_application",
          "content_cid": "ipfs/arweave/supabase_file_ref",
          "evidence_summary": [...]
        }

        Do not place private applicant email, private docs, or full proposal body here.
        """

        self._require_round_status(round_id, ["OPEN"])
        self._require_not_round_creator(round_id)

        parsed = self._json_load(proposal_json, "proposal")

        if "title" not in parsed or not str(parsed.get("title", "")).strip():
            raise VmUserError("Proposal title required")

        if "content_hash" not in parsed or not str(parsed.get("content_hash", "")).strip():
            raise VmUserError("Proposal content_hash required")

        if float(parsed.get("requested_amount", 0)) < 0:
            raise VmUserError("Requested amount cannot be negative")

        proposal_id = self._next_id("proposal", self.proposal_count)

        parsed["id"] = proposal_id
        parsed["round_id"] = round_id
        parsed["applicant"] = self._sender()
        parsed["status"] = "SUBMITTED"
        parsed["created_by_contract"] = True

        self.proposals[proposal_id] = json.dumps(parsed)

        rp = json.loads(self.round_proposals[round_id]) if round_id in self.round_proposals else []
        rp.append(proposal_id)
        self.round_proposals[round_id] = json.dumps(rp)

        sender = self._sender()
        up = json.loads(self.user_proposals[sender]) if sender in self.user_proposals else []
        up.append(proposal_id)
        self.user_proposals[sender] = json.dumps(up)

        self.proposal_evidence[proposal_id] = json.dumps([])

        rnd = self._get_round(round_id)
        rnd["proposal_count"] = int(rnd.get("proposal_count", 0)) + 1
        self.rounds[round_id] = json.dumps(rnd)

        self.proposal_count = u256(int(self.proposal_count) + 1)
        self.protocol_stats["last_proposal_id"] = proposal_id

        return proposal_id

    @gl.public.write
    def add_evidence(self, proposal_id: str, evidence_json: str) -> str:
        proposal = self._get_proposal(proposal_id)

        if self._sender() != str(proposal.get("applicant", "")):
            raise VmUserError("Only proposal applicant can add evidence")

        round_id = str(proposal.get("round_id", ""))
        self._require_round_status(round_id, ["OPEN", "REVIEWING"])

        parsed = self._json_load(evidence_json, "evidence")

        if "evidence_hash" not in parsed or not str(parsed.get("evidence_hash", "")).strip():
            raise VmUserError("evidence_hash required")

        evidence_id = self._next_id("evidence", self.evidence_count)

        parsed["id"] = evidence_id
        parsed["proposal_id"] = proposal_id
        parsed["submitted_by"] = self._sender()

        existing = json.loads(self.proposal_evidence[proposal_id]) if proposal_id in self.proposal_evidence else []
        existing.append(parsed)
        self.proposal_evidence[proposal_id] = json.dumps(existing)

        self.evidence_count = u256(int(self.evidence_count) + 1)
        self.protocol_stats["last_evidence_id"] = evidence_id

        return evidence_id

    # -------------------------------------------------------------------------
    # GenLayer non-deterministic proposal review
    # -------------------------------------------------------------------------

    @gl.public.write
    def review_proposal(self, proposal_id: str) -> None:
        proposal = self._get_proposal(proposal_id)
        round_id = str(proposal.get("round_id", ""))

        self._require_round_status(round_id, ["CLOSED", "REVIEWING"])

        rubric = self.round_rubrics[round_id] if round_id in self.round_rubrics else "{}"
        evidence = self.proposal_evidence[proposal_id] if proposal_id in self.proposal_evidence else "[]"

        safe_proposal = self._safe_public_proposal(proposal)

        def review_task() -> str:
            prompt = f"""
You are reviewing a grant proposal for a funding programme.

This is not a normal summary task.
You must make an evidence-supported funding judgement.

Assess the proposal against the round rubric.
Do not rely only on self-claims.
Judge whether the submitted evidence supports the applicant's claims.
Consider relevance, originality, methodology, feasibility, impact,
applicant capability, budget reasonableness, ethics, risk, and evidence strength.

Do not invent missing facts.
If information is missing, mark it as missing.
If the proposal needs human escalation, say so.
Distinguish weak evidence from bad faith.

PROPOSAL PUBLIC JSON:
{json.dumps(safe_proposal)}

ROUND RUBRIC JSON:
{rubric}

EVIDENCE JSON:
{evidence}

Return STRICT JSON ONLY with this exact schema:
{{
  "verdict": "RECOMMENDED_FOR_FUNDING|PARTIAL_FUNDING_RECOMMENDED|WAITLISTED|REJECTED|NEEDS_MORE_EVIDENCE|ESCALATE",
  "funding_suitability": "VERY_HIGH|HIGH|MODERATE|LOW|NOT_SUITABLE|UNCLEAR",
  "merit_score": 0-100,
  "confidence": 0-100,
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "recommended_funding_amount": number,
  "requested_amount": number,
  "currency": "string",
  "research_relevance": {{"score": 0-100, "reason": "string"}},
  "originality": {{"score": 0-100, "plagiarism_risk": "LOW|MEDIUM|HIGH|CRITICAL", "reason": "string"}},
  "methodology_quality": {{"score": 0-100, "reason": "string"}},
  "feasibility": {{"score": 0-100, "reason": "string"}},
  "expected_impact": {{"score": 0-100, "reason": "string"}},
  "budget_reasonableness": {{"score": 0-100, "reason": "string"}},
  "ethics_and_risk": {{"score": 0-100, "reason": "string"}},
  "evidence_strength": {{"score": 0-100, "reason": "string"}},
  "positive_signals": ["string"],
  "red_flags": ["string"],
  "missing_information": ["string"],
  "recommended_action": "string",
  "reasoning_summary": "string"
}}
"""
            res = gl.nondet.exec_prompt(prompt)
            return res.replace("```json", "").replace("```", "").strip()

        result = gl.eq_principle.strict_eq(review_task)
        parsed = json.loads(result)

        self._validate_review(parsed)

        parsed["proposal_id"] = proposal_id
        parsed["round_id"] = round_id
        parsed["review_index"] = int(self.review_count)

        self.proposal_reviews[proposal_id] = json.dumps(parsed)

        self.funding_recommendations[proposal_id] = json.dumps({
            "proposal_id": proposal_id,
            "round_id": round_id,
            "verdict": parsed["verdict"],
            "merit_score": parsed.get("merit_score", 0),
            "confidence": parsed.get("confidence", 0),
            "recommended_funding_amount": parsed.get("recommended_funding_amount", 0),
            "requested_amount": parsed.get("requested_amount", proposal.get("requested_amount", 0)),
            "currency": parsed.get("currency", proposal.get("currency", "")),
            "risk_level": parsed.get("risk_level", ""),
            "reasoning_summary": parsed.get("reasoning_summary", ""),
        })

        proposal["status"] = parsed["verdict"] if parsed["verdict"] != "ESCALATE" else "ESCALATED"
        self.proposals[proposal_id] = json.dumps(proposal)

        self.review_count = u256(int(self.review_count) + 1)

    @gl.public.write
    def rank_round_proposals(self, round_id: str) -> None:
        self._only_round_creator_or_protocol_owner(round_id)

        rnd = self._require_round_status(round_id, ["CLOSED", "REVIEWING"])

        rubric = self.round_rubrics[round_id] if round_id in self.round_rubrics else "{}"
        proposal_ids = json.loads(self.round_proposals[round_id]) if round_id in self.round_proposals else []

        proposals_data = []
        reviews_data = []

        for pid in proposal_ids:
            if pid in self.proposals:
                proposal = json.loads(self.proposals[pid])
                proposals_data.append(self._safe_public_proposal(proposal) | {
                    "id": pid,
                    "status": proposal.get("status", ""),
                    "round_id": proposal.get("round_id", ""),
                })

            if pid in self.proposal_reviews:
                reviews_data.append(json.loads(self.proposal_reviews[pid]))

        def rank_task() -> str:
            prompt = f"""
You are ranking proposals in a grant round.

This is a funding allocation judgement, not a simple sort.
Rank proposals by evidence-supported merit and funding suitability.
Use the rubric as guidance, but do not blindly average scores.
Consider methodology, feasibility, impact, originality, applicant capability,
ethics/risk, budget fit, evidence strength, and red flags.

Use tie-break reasoning where proposals are close.
Recommend full funding, partial funding, waitlist, rejection, or more evidence.
Do not invent facts. Escalate where evidence is insufficient.

ROUND JSON:
{json.dumps(rnd)}

RUBRIC JSON:
{rubric}

PROPOSALS JSON:
{json.dumps(proposals_data)}

PRIOR GENLAYER REVIEWS JSON:
{json.dumps(reviews_data)}

Return STRICT JSON ONLY:
{{
  "round_id": "string",
  "ranking_status": "RANKED|PARTIALLY_RANKED|NEEDS_MORE_EVIDENCE|ESCALATE",
  "total_proposals_reviewed": number,
  "ranking_confidence": 0-100,
  "ranked_proposals": [
    {{
      "proposal_id":"string",
      "rank":number,
      "merit_score":0-100,
      "recommended_funding":number,
      "decision":"RECOMMENDED_FOR_FUNDING|PARTIAL_FUNDING_RECOMMENDED|WAITLISTED|REJECTED|NEEDS_MORE_EVIDENCE|ESCALATE",
      "reason":"string"
    }}
  ],
  "funding_summary": {{"total_pool": number, "total_recommended": number, "currency": "string"}},
  "round_findings": ["string"],
  "tie_breaks": ["string"],
  "red_flags": ["string"],
  "reasoning_summary": "string"
}}
"""
            res = gl.nondet.exec_prompt(prompt)
            return res.replace("```json", "").replace("```", "").strip()

        result = gl.eq_principle.strict_eq(rank_task)
        parsed = json.loads(result)

        self._validate_ranking(parsed)

        parsed["round_id"] = round_id
        parsed["ranking_index"] = int(self.ranking_count)

        self.round_rankings[round_id] = json.dumps(parsed)

        rnd["status"] = "RANKED"
        rnd["ranking_count"] = int(rnd.get("ranking_count", 0)) + 1
        self.rounds[round_id] = json.dumps(rnd)

        self.ranking_count = u256(int(self.ranking_count) + 1)

    @gl.public.write
    def detect_proposal_similarity(self, proposal_id: str, comparison_proposal_id: str) -> str:
        if proposal_id == comparison_proposal_id:
            raise VmUserError("Cannot compare proposal with itself")

        proposal_a = self._get_proposal(proposal_id)
        proposal_b = self._get_proposal(comparison_proposal_id)

        a = self._safe_public_proposal(proposal_a)
        b = self._safe_public_proposal(proposal_b)

        def task() -> str:
            prompt = f"""
Compare two grant proposals for similarity/plagiarism risk.

Distinguish normal grant-template similarity from substantial duplication.
Do not over-penalise common language used in grant applications.
Look for copied structure, copied claims, copied methods, copied budgets,
or suspicious reuse of evidence.

PROPOSAL A:
{json.dumps(a)}

PROPOSAL B:
{json.dumps(b)}

Return STRICT JSON ONLY:
{{
  "similarity_verdict": "NO_SIGNIFICANT_SIMILARITY|NORMAL_TEMPLATE_SIMILARITY|POSSIBLE_DUPLICATE|LIKELY_PLAGIARISED|NEEDS_MANUAL_REVIEW",
  "similarity_score": 0-100,
  "plagiarism_risk": "LOW|MEDIUM|HIGH|CRITICAL",
  "matched_elements": ["string"],
  "explanation": "string"
}}
"""
            res = gl.nondet.exec_prompt(prompt)
            return res.replace("```json", "").replace("```", "").strip()

        result = gl.eq_principle.strict_eq(task)
        parsed = json.loads(result)

        if parsed.get("similarity_verdict") not in ALLOWED_SIMILARITY_VERDICTS:
            raise VmUserError("Invalid similarity verdict")

        if parsed.get("plagiarism_risk") not in ALLOWED_PLAGIARISM:
            raise VmUserError("Invalid plagiarism risk")

        if not (0 <= float(parsed.get("similarity_score", -1)) <= 100):
            raise VmUserError("Invalid similarity score")

        similarity_id = self._next_id("similarity", self.similarity_count)

        parsed["id"] = similarity_id
        parsed["proposal_id"] = proposal_id
        parsed["comparison_proposal_id"] = comparison_proposal_id

        self.similarity_reviews[similarity_id] = json.dumps(parsed)
        self.similarity_count = u256(int(self.similarity_count) + 1)

        return similarity_id

    # -------------------------------------------------------------------------
    # Appeals
    # -------------------------------------------------------------------------

    @gl.public.write
    def open_appeal(self, proposal_id: str, appeal_json: str) -> str:
        proposal = self._get_proposal(proposal_id)

        if self._sender() != str(proposal.get("applicant", "")):
            raise VmUserError("Only applicant can appeal their proposal decision")

        round_id = str(proposal.get("round_id", ""))
        self._require_round_status(round_id, ["RANKED", "FINALIZED"])

        parsed = self._json_load(appeal_json, "appeal")

        if "appeal_hash" not in parsed or not str(parsed.get("appeal_hash", "")).strip():
            raise VmUserError("appeal_hash required")

        appeal_id = self._next_id("appeal", self.appeal_count)

        parsed["id"] = appeal_id
        parsed["proposal_id"] = proposal_id
        parsed["round_id"] = round_id
        parsed["applicant"] = self._sender()

        self.appeals[appeal_id] = json.dumps(parsed)

        proposal["status"] = "APPEALED"
        self.proposals[proposal_id] = json.dumps(proposal)

        self.appeal_count = u256(int(self.appeal_count) + 1)
        self.protocol_stats["last_appeal_id"] = appeal_id

        return appeal_id

    @gl.public.write
    def review_appeal(self, appeal_id: str) -> None:
        if appeal_id not in self.appeals:
            raise VmUserError("Appeal does not exist")

        appeal = json.loads(self.appeals[appeal_id])
        proposal_id = str(appeal.get("proposal_id", ""))

        proposal = self.proposals[proposal_id] if proposal_id in self.proposals else "{}"
        prior_review = self.proposal_reviews[proposal_id] if proposal_id in self.proposal_reviews else "{}"
        evidence = self.proposal_evidence[proposal_id] if proposal_id in self.proposal_evidence else "[]"

        def task() -> str:
            prompt = f"""
You are reviewing a grant appeal.

Consider the original public proposal, original GenLayer review,
appeal reasoning, and any evidence references.
Be fair, structured, and evidence-driven.

Do not invent facts.
If the appeal raises valid missing evidence or unfair assessment, say so.
If the appeal is weak or unsupported, say so.
Escalate to human panel if the evidence is ambiguous or sensitive.

APPEAL:
{json.dumps(appeal)}

PROPOSAL:
{proposal}

PRIOR REVIEW:
{prior_review}

EVIDENCE:
{evidence}

Return STRICT JSON ONLY:
{{
  "appeal_decision": "ORIGINAL_DECISION_UPHELD|ORIGINAL_DECISION_ADJUSTED|MORE_EVIDENCE_REQUIRED|ESCALATE_TO_HUMAN_PANEL|APPEAL_REJECTED",
  "new_proposal_decision": "RECOMMENDED_FOR_FUNDING|PARTIAL_FUNDING_RECOMMENDED|WAITLISTED|REJECTED|NEEDS_MORE_EVIDENCE|ESCALATE",
  "new_merit_score": 0-100,
  "adjusted_recommended_funding": number,
  "confidence": 0-100,
  "accepted_arguments": ["string"],
  "rejected_arguments": ["string"],
  "reasoning_summary": "string",
  "final_recommendation": "string"
}}
"""
            res = gl.nondet.exec_prompt(prompt)
            return res.replace("```json", "").replace("```", "").strip()

        result = gl.eq_principle.strict_eq(task)
        parsed = json.loads(result)

        if parsed.get("appeal_decision") not in ALLOWED_APPEAL_DECISIONS:
            raise VmUserError("Invalid appeal decision")

        if parsed.get("new_proposal_decision") not in ALLOWED_VERDICTS:
            raise VmUserError("Invalid new proposal decision")

        if not (0 <= float(parsed.get("new_merit_score", -1)) <= 100):
            raise VmUserError("Invalid new merit score")

        if not (0 <= float(parsed.get("confidence", -1)) <= 100):
            raise VmUserError("Invalid confidence")

        parsed["appeal_id"] = appeal_id
        parsed["proposal_id"] = proposal_id

        self.appeal_reviews[appeal_id] = json.dumps(parsed)

        proposal_obj = json.loads(proposal)
        new_decision = parsed.get("new_proposal_decision", "")

        if new_decision == "ESCALATE":
            proposal_obj["status"] = "ESCALATED"
        else:
            proposal_obj["status"] = new_decision

        self.proposals[proposal_id] = json.dumps(proposal_obj)

    # -------------------------------------------------------------------------
    # Milestones
    # -------------------------------------------------------------------------

    @gl.public.write
    def submit_milestone(self, proposal_id: str, milestone_json: str) -> str:
        proposal = self._get_proposal(proposal_id)

        if self._sender() != str(proposal.get("applicant", "")):
            raise VmUserError("Only applicant can submit milestone")

        if str(proposal.get("status", "")) not in {
            "RECOMMENDED_FOR_FUNDING",
            "PARTIAL_FUNDING_RECOMMENDED",
            "FUNDED",
        }:
            raise VmUserError("Milestones can only be submitted for funded/recommended proposals")

        parsed = self._json_load(milestone_json, "milestone")

        if "milestone_hash" not in parsed or not str(parsed.get("milestone_hash", "")).strip():
            raise VmUserError("milestone_hash required")

        milestone_id = self._next_id("milestone", self.milestone_count)

        parsed["id"] = milestone_id
        parsed["proposal_id"] = proposal_id
        parsed["round_id"] = proposal.get("round_id", "")
        parsed["submitted_by"] = self._sender()

        self.milestones[milestone_id] = json.dumps(parsed)

        self.milestone_count = u256(int(self.milestone_count) + 1)
        self.protocol_stats["last_milestone_id"] = milestone_id

        return milestone_id

    @gl.public.write
    def review_milestone(self, milestone_id: str) -> None:
        if milestone_id not in self.milestones:
            raise VmUserError("Milestone does not exist")

        milestone = json.loads(self.milestones[milestone_id])
        proposal_id = str(milestone.get("proposal_id", ""))

        proposal = self.proposals[proposal_id] if proposal_id in self.proposals else "{}"
        prior_review = self.proposal_reviews[proposal_id] if proposal_id in self.proposal_reviews else "{}"

        def task() -> str:
            prompt = f"""
You are reviewing a milestone report from a funded grant proposal.

Assess whether the report shows real progress against the original proposal.
Assess whether the evidence is credible.
Decide whether the next funding tranche should be released.

Do not invent facts.
If evidence is weak or missing, say so.
If there are quality concerns, list them.
Escalate where human judgement is required.

ORIGINAL PROPOSAL:
{proposal}

ORIGINAL GENLAYER REVIEW:
{prior_review}

MILESTONE REPORT:
{json.dumps(milestone)}

Return STRICT JSON ONLY:
{{
  "milestone_decision": "ACCEPTED|PARTIALLY_ACCEPTED|REJECTED|NEEDS_MORE_EVIDENCE|ESCALATE",
  "delivery_score": 0-100,
  "confidence": 0-100,
  "release_next_tranche": true,
  "accepted_deliverables": ["string"],
  "missing_deliverables": ["string"],
  "quality_concerns": ["string"],
  "reasoning_summary": "string",
  "recommended_action": "string"
}}
"""
            res = gl.nondet.exec_prompt(prompt)
            return res.replace("```json", "").replace("```", "").strip()

        result = gl.eq_principle.strict_eq(task)
        parsed = json.loads(result)

        if parsed.get("milestone_decision") not in ALLOWED_MILESTONE_DECISIONS:
            raise VmUserError("Invalid milestone decision")

        if not (0 <= float(parsed.get("delivery_score", -1)) <= 100):
            raise VmUserError("Invalid delivery score")

        if not (0 <= float(parsed.get("confidence", -1)) <= 100):
            raise VmUserError("Invalid confidence")

        parsed["milestone_id"] = milestone_id
        parsed["proposal_id"] = proposal_id

        self.milestone_reviews[milestone_id] = json.dumps(parsed)

    # -------------------------------------------------------------------------
    # Views
    # -------------------------------------------------------------------------

    @gl.public.view
    def get_round(self, round_id: str) -> str:
        return self.rounds[round_id] if round_id in self.rounds else ""

    @gl.public.view
    def get_rubric(self, round_id: str) -> str:
        return self.round_rubrics[round_id] if round_id in self.round_rubrics else ""

    @gl.public.view
    def get_proposal(self, proposal_id: str) -> str:
        return self.proposals[proposal_id] if proposal_id in self.proposals else ""

    @gl.public.view
    def get_proposal_evidence(self, proposal_id: str) -> str:
        return self.proposal_evidence[proposal_id] if proposal_id in self.proposal_evidence else "[]"

    @gl.public.view
    def get_user_proposals(self, user: str) -> str:
        return self.user_proposals[user] if user in self.user_proposals else "[]"

    @gl.public.view
    def get_round_proposals(self, round_id: str) -> str:
        return self.round_proposals[round_id] if round_id in self.round_proposals else "[]"

    @gl.public.view
    def get_proposal_review(self, proposal_id: str) -> str:
        return self.proposal_reviews[proposal_id] if proposal_id in self.proposal_reviews else ""

    @gl.public.view
    def get_funding_recommendation(self, proposal_id: str) -> str:
        return self.funding_recommendations[proposal_id] if proposal_id in self.funding_recommendations else ""

    @gl.public.view
    def get_round_ranking(self, round_id: str) -> str:
        return self.round_rankings[round_id] if round_id in self.round_rankings else ""

    @gl.public.view
    def get_appeal(self, appeal_id: str) -> str:
        return self.appeals[appeal_id] if appeal_id in self.appeals else ""

    @gl.public.view
    def get_appeal_review(self, appeal_id: str) -> str:
        return self.appeal_reviews[appeal_id] if appeal_id in self.appeal_reviews else ""

    @gl.public.view
    def get_milestone(self, milestone_id: str) -> str:
        return self.milestones[milestone_id] if milestone_id in self.milestones else ""

    @gl.public.view
    def get_milestone_review(self, milestone_id: str) -> str:
        return self.milestone_reviews[milestone_id] if milestone_id in self.milestone_reviews else ""

    @gl.public.view
    def get_similarity_review(self, similarity_id: str) -> str:
        return self.similarity_reviews[similarity_id] if similarity_id in self.similarity_reviews else ""

    @gl.public.view
    def get_all_rounds(self) -> str:
        out = []
        for k in self.rounds:
            out.append({
                "id": k,
                "data": self.rounds[k],
            })
        return json.dumps(out)

    @gl.public.view
    def get_protocol_stats(self) -> str:
        return json.dumps({
            "round_count": int(self.round_count),
            "proposal_count": int(self.proposal_count),
            "evidence_count": int(self.evidence_count),
            "review_count": int(self.review_count),
            "ranking_count": int(self.ranking_count),
            "appeal_count": int(self.appeal_count),
            "milestone_count": int(self.milestone_count),
            "similarity_count": int(self.similarity_count),
            "last_round_id": self.protocol_stats["last_round_id"] if "last_round_id" in self.protocol_stats else "",
            "last_proposal_id": self.protocol_stats["last_proposal_id"] if "last_proposal_id" in self.protocol_stats else "",
        })

    # -------------------------------------------------------------------------
    # Validation helpers
    # -------------------------------------------------------------------------

    def _validate_review(self, p: dict) -> None:
        required = [
            "verdict",
            "funding_suitability",
            "merit_score",
            "confidence",
            "risk_level",
            "recommended_funding_amount",
            "requested_amount",
            "currency",
            "research_relevance",
            "originality",
            "methodology_quality",
            "feasibility",
            "expected_impact",
            "budget_reasonableness",
            "ethics_and_risk",
            "evidence_strength",
            "positive_signals",
            "red_flags",
            "missing_information",
            "recommended_action",
            "reasoning_summary",
        ]

        for f in required:
            if f not in p:
                raise VmUserError("Review missing field: " + f)

        if p["verdict"] not in ALLOWED_VERDICTS:
            raise VmUserError("Invalid verdict")

        if p["funding_suitability"] not in ALLOWED_FUNDING_SUITABILITY:
            raise VmUserError("Invalid funding_suitability")

        if p["risk_level"] not in ALLOWED_RISK:
            raise VmUserError("Invalid risk_level")

        if not (0 <= float(p["merit_score"]) <= 100):
            raise VmUserError("merit_score out of range")

        if not (0 <= float(p["confidence"]) <= 100):
            raise VmUserError("confidence out of range")

        if float(p.get("recommended_funding_amount", 0)) < 0:
            raise VmUserError("recommended_funding_amount negative")

        if float(p.get("requested_amount", 0)) < 0:
            raise VmUserError("requested_amount negative")

        for sub in [
            "research_relevance",
            "methodology_quality",
            "feasibility",
            "expected_impact",
            "budget_reasonableness",
            "ethics_and_risk",
            "evidence_strength",
        ]:
            s = p[sub]

            if not isinstance(s, dict):
                raise VmUserError(sub + " must be object")

            if not (0 <= float(s.get("score", -1)) <= 100):
                raise VmUserError(sub + " score out of range")

            if not str(s.get("reason", "")).strip():
                raise VmUserError(sub + " reason required")

        originality = p["originality"]

        if not isinstance(originality, dict):
            raise VmUserError("originality must be object")

        if not (0 <= float(originality.get("score", -1)) <= 100):
            raise VmUserError("originality score out of range")

        if originality.get("plagiarism_risk") not in ALLOWED_PLAGIARISM:
            raise VmUserError("Invalid plagiarism_risk")

        for arr in ["positive_signals", "red_flags", "missing_information"]:
            if not isinstance(p[arr], list):
                raise VmUserError(arr + " must be array")

        if not str(p["reasoning_summary"]).strip():
            raise VmUserError("reasoning_summary empty")

    def _validate_ranking(self, p: dict) -> None:
        if p.get("ranking_status") not in ALLOWED_RANKING_STATUS:
            raise VmUserError("Invalid ranking_status")

        if not isinstance(p.get("ranked_proposals"), list):
            raise VmUserError("ranked_proposals must be array")

        if not (0 <= float(p.get("ranking_confidence", -1)) <= 100):
            raise VmUserError("ranking_confidence out of range")

        for rp in p["ranked_proposals"]:
            if rp.get("decision") not in ALLOWED_VERDICTS:
                raise VmUserError("Invalid ranked proposal decision")

            if not (0 <= float(rp.get("merit_score", -1)) <= 100):
                raise VmUserError("Invalid ranked proposal merit_score")

            if int(rp.get("rank", 0)) <= 0:
                raise VmUserError("Invalid rank")

            if float(rp.get("recommended_funding", 0)) < 0:
                raise VmUserError("Invalid recommended funding")

        if not str(p.get("reasoning_summary", "")).strip():
            raise VmUserError("reasoning_summary empty")