# MERITRA — GenLayer Research Grant Reviewer

Research merit reviewed by evidence, feasibility, and consensus.

## Stack
- Next.js 15 (App Router) · TypeScript strict · Tailwind CSS
- GenLayer JS SDK (`genlayer-js` 1.2+) · Viem
- React Hook Form · Zod
- npm only

## Getting started

```bash
npm install
cp .env.local.example .env.local
# Deploy contracts/Meritra.py to GenLayer Studionet, then put the address in:
# NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=
npm run dev
```

Open http://localhost:3000.

## GenLayer Studionet

| Field | Value |
| --- | --- |
| Chain ID | 61999 |
| RPC | https://studio.genlayer.com/api |
| Explorer | https://explorer-studio.genlayer.com |
| Currency | GEN |

## Contract

`contracts/Meritra.py` is the source of truth. Deterministic writes record
data; non-deterministic GenLayer functions produce the merit/funding judgement:

- `review_proposal(proposal_id)` — main consensus review
- `rank_round_proposals(round_id)` — round-level ranking
- `detect_proposal_similarity(a, b)` — originality check
- `review_appeal(appeal_id)`
- `review_milestone(milestone_id)`

All outputs are validated server-side in the contract before being stored.

## Flow

```
Admin creates a research grant round
  → Applicant submits a proposal
  → Applicant adds evidence
  → Admin closes the round
  → GenLayer reviews proposals
  → GenLayer ranks the round
  → Contract stores real consensus result
  → Frontend reads and displays the stored result
```

No demo data. No mock proposals. No fake transactions.

## Disclaimer

MERITRA provides decentralised research merit and funding suitability review.
It is not legal advice or a regulated funding decision unless adopted by the
relevant organisation.
