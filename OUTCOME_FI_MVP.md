# outcome.fi — 1 Hour MVP PRD

**Tagline:** Bet on What If  
**Track:** Build with an AI Agent on Movement Network  
**Goal:** Ship a no-fail live demo in 60 minutes.

---

## Product Thesis

Prediction markets leak live odds, so people follow the crowd.  
outcome.fi removes that bias with a blind commit phase, then reveals the tally like election night.  
When the vote resolves, the winning branch becomes the canonical timeline.

---

## MVP Outcome (What Must Exist)

One page, one scenario, three on-chain phases:

1. **Commit**
- Users connect wallet and cast one hidden vote.
- Only total vote count is visible.

2. **Reveal**
- Vote breakdown becomes visible as bars.
- Admin can seal the timeline.

3. **Resolved**
- Winner is fixed on-chain.
- App shows deterministic "canonical timeline" story text (no external AI dependency).

---

## Hard Scope Cuts

- No Claude or external LLM API calls.
- No streaming story UI.
- No token payouts or prize logic.
- No multi-scenario support.
- No heavy animations required for correctness.
- No mobile-perfect polish beyond functional responsiveness.

---

## Smart Contract (Movement Move)

File: `contracts/sources/outcome_fi.move`

### Storage

- `Scenario`: question, 4 choices, phase, vote counts, total votes, winner, admin.
- `VoteReceipt`: per-voter marker to prevent double voting.

### Entry Functions

- `initialize(question, a, b, c, d)` admin only, one-time scenario setup.
- `vote(scenario_addr, choice)` one vote per address during Commit.
- `advance_phase(scenario_addr)` admin only, Commit -> Reveal.
- `resolve(scenario_addr)` admin only during Reveal, computes winner and sets Resolved.

### View Functions

- `get_scenario(addr)` returns question, choices, phase, total votes.
- `get_vote_counts(addr)` returns zeroed counts during Commit, real counts after Reveal.
- `has_voted(addr)` returns true/false.
- `get_winner(addr)` winner index after resolution.

---

## Frontend Scope (Next.js)

### Required Components

- `ScenarioCard`: polling and phase-based render.
- `VotePanel`: choice selection + vote tx submit.
- `RevealBars`: count and percentage bars.

### Required UX

- Wallet connect/disconnect.
- Commit vote button with pending/success/error feedback.
- Admin-only buttons:
  - Commit phase: `Advance to Reveal`
  - Reveal phase: `Seal This Timeline`
- Resolution panel with deterministic canonical story text from local template.
- Explorer link for latest tx hash.

### Reliability Rule

If chain read fails, show setup/error state with scenario address and retry.

---

## Environment Variables

`frontend/.env.local`:

```bash
NEXT_PUBLIC_OUTCOME_MODULE_ADDRESS=0xdd525d357675655d18cecf68c3a7f29de3cda46ba4e4d0065ac9debdb8982575
NEXT_PUBLIC_SCENARIO_ADDRESS=0xdd525d357675655d18cecf68c3a7f29de3cda46ba4e4d0065ac9debdb8982575
NEXT_PUBLIC_MODULE_NAME=outcome_fi
```

---

## 60-Minute Build Plan

1. **0-15 min** Contract
- Implement `outcome_fi.move`.
- Compile + publish.

2. **15-25 min** Initialize + seed
- Initialize scenario.
- Cast a few votes from test wallets for reveal impact.

3. **25-45 min** Frontend wiring
- Build scenario page, voting flow, reveal bars, admin actions.
- Add polling and tx toasts.

4. **45-55 min** Resolution + fallback
- Deterministic story panel for winning choice.
- Error/retry state for missing scenario.

5. **55-60 min** Demo rehearsal
- Dry run full flow end-to-end once.
- Keep exact command sequence open in terminal.

---

## Deploy + Setup Commands

### Publish

```bash
cd contracts
movement move publish --named-addresses move_hackathon=0xdd525d357675655d18cecf68c3a7f29de3cda46ba4e4d0065ac9debdb8982575
```

### Initialize Scenario

```bash
movement move run \
  --function-id 0xdd525d357675655d18cecf68c3a7f29de3cda46ba4e4d0065ac9debdb8982575::outcome_fi::initialize \
  --args \
    string:"What if Ethereum was never created?" \
    string:"Bitcoin becomes the only smart contract platform" \
    string:"A rival team builds something even better" \
    string:"DeFi never happens and crypto stays niche" \
    string:"Satoshi adds smart contracts to Bitcoin"
```

### Advance to Reveal (Admin)

```bash
movement move run \
  --function-id 0xdd525d357675655d18cecf68c3a7f29de3cda46ba4e4d0065ac9debdb8982575::outcome_fi::advance_phase \
  --args address:0xdd525d357675655d18cecf68c3a7f29de3cda46ba4e4d0065ac9debdb8982575
```

### Resolve Timeline (Admin)

```bash
movement move run \
  --function-id 0xdd525d357675655d18cecf68c3a7f29de3cda46ba4e4d0065ac9debdb8982575::outcome_fi::resolve \
  --args address:0xdd525d357675655d18cecf68c3a7f29de3cda46ba4e4d0065ac9debdb8982575
```

---

## Demo Script (45-60s)

1. "Most prediction markets show live odds, so people herd. We hide odds during commit."
2. Show commit screen with total votes only.
3. Cast one live vote.
4. Advance to reveal and show result bars.
5. Seal timeline to resolve.
6. Show canonical winner story and explorer link.
7. Close: "Consensus doesn't just predict the future here. It writes the timeline."

---

## Winning Criteria for This Hackathon Build

- End-to-end flow works every run.
- No external API dependency can break live demo.
- On-chain state transitions are visible and understandable to judges.
- Narrative is crisp: blind vote -> reveal -> canonical timeline.
