# outcome.fi Level 2 Spec

## Goal

Move from **single scenario MVP** to **Universe mode**:

- One headline event (e.g. `Satoshi moves his sats`)
- Multiple linked scenarios under that event
- One final AI-generated narrative that combines all resolved scenario outcomes

This version must use **Vercel AI Agent SDK** for AI generation workflows.

---

## Product Model

### Universe
- Top-level event headline
- Contains N scenarios (typically 3-6)
- Has a final `sealed narrative` generated after all scenarios resolve

### Scenario
- A specific question under the universe
- Exactly 4 mutually exclusive options
- Independent voting and resolution

### Final Narrative
- AI writes one coherent story across all resolved winners
- Example:
  - Headline: `Satoshi moves his sats`
  - Winners:
    - BTC crash scenario winner = `sharp crash then slow recovery`
    - Trump reserve scenario winner = `Trump holds reserves`
    - Nasdaq scenario winner = `risk-off dip`
  - Narrative combines these into one timeline

---

## Why V2 Requires Contract Changes

Current contract stores one `Scenario` resource per address and one global `VoteReceipt` per voter, so it cannot support multi-scenario universes cleanly.

Level 2 contract must support:

- Multiple scenarios in one universe
- Vote receipt per `(voter, scenario_id)`
- Universe finalization after all scenario resolutions

---

## On-Chain Spec (Move V2)

### Resources

`UniverseStore` (at admin address):
- `next_universe_id: u64`
- `next_scenario_id: u64`
- `universes: vector<Universe>`
- `scenarios: vector<Scenario>`

`Universe`:
- `id: u64`
- `headline: String`
- `scenario_ids: vector<u64>`
- `status: u8` (`0=OPEN`, `1=PARTIAL`, `2=COMPLETE`)
- `final_story_hash: String` (empty until sealed)
- `admin: address`

`Scenario`:
- `id: u64`
- `universe_id: u64`
- `question: String`
- `choices: vector<String>` (len = 4)
- `phase: u8` (`0=COMMIT`, `1=REVEAL`, `2=RESOLVED`)
- `vote_counts: vector<u64>` (len = 4)
- `total_votes: u64`
- `winning_choice: u8` (`255` until resolved)

`VoteReceipt` (at voter address):
- `scenario_ids: vector<u64>` (scenarios this address already voted in)

### Entry Functions

- `init_store(admin)`
- `create_universe(admin, headline)`
- `add_scenario(admin, universe_id, question, a, b, c, d)`
- `vote(voter, scenario_id, choice)`
- `advance_phase(admin, scenario_id)` (`COMMIT -> REVEAL`)
- `resolve_scenario(admin, scenario_id)` (`REVEAL -> RESOLVED`)
- `seal_universe(admin, universe_id, final_story_hash)` (requires all universe scenarios resolved)

### View Functions

- `get_universe(universe_id)`
- `list_universe_scenarios(universe_id)`
- `get_scenario(scenario_id)`
- `get_vote_counts(scenario_id)` (return zeros during commit)
- `has_voted_in_scenario(voter, scenario_id)`

### Events

- `UniverseCreated`
- `ScenarioAdded`
- `ScenarioVoteCast`
- `ScenarioPhaseAdvanced`
- `ScenarioResolved`
- `UniverseSealed`

---

## Backend + AI Spec (Vercel AI Agent SDK)

### Required Tech

- Next.js API routes / server actions
- **Vercel AI Agent SDK** for orchestration and tool-calling
- Model provider adapter (OpenAI/Anthropic/Groq etc.) through AI SDK
- Persistent DB (Supabase/Postgres recommended)

### Agents

#### 1) `ScenarioPlannerAgent`
Input:
- `headline`
- optional tone/style constraints

Output:
- 3-6 scenario drafts
- each with question + 4 options
- rationale per scenario

Rules:
- options must be mutually exclusive
- avoid duplicates and tautologies
- each scenario must clearly connect to headline

#### 2) `NarrativeComposerAgent`
Input:
- headline
- resolved scenarios + winning options + vote distributions

Output:
- canonical narrative (400-700 words)
- sections:
  - immediate reaction
  - second-order effects
  - political/market implications
  - closing timeline summary

Rules:
- must reference all scenario winners
- must be internally consistent
- no unsupported real-world factual claims presented as true

### Agent Tools

- `fetchUniverseState(universeId)` (read DB + chain cache)
- `fetchResolvedScenarios(universeId)`
- `validateScenarioDrafts(drafts)` (schema + dedupe + exclusivity checks)
- `storeDrafts(universeId, drafts)`
- `storeFinalNarrative(universeId, narrative, metadata)`

---

## API Contract (Level 2)

### `POST /api/ai/universes/draft-scenarios`
Body:
```json
{
  "headline": "Satoshi moves his sats",
  "targetCount": 3
}
```
Response:
```json
{
  "universeDraftId": "uuid",
  "scenarios": [
    {
      "question": "BTC market reaction in next 72h?",
      "options": ["...", "...", "...", "..."],
      "rationale": "..."
    }
  ]
}
```

### `POST /api/universes/publish`
Body:
```json
{
  "headline": "...",
  "scenarios": [
    { "question": "...", "options": ["a", "b", "c", "d"] }
  ]
}
```
Action:
- creates universe + scenarios on-chain (admin-signed flow)

### `POST /api/ai/universes/:id/generate-narrative`
Body:
```json
{
  "universeId": "42"
}
```
Action:
- fetch resolved outcomes
- run `NarrativeComposerAgent`
- persist narrative
- returns `story` + `storyHash`

### `POST /api/universes/:id/seal`
Body:
```json
{
  "storyHash": "0x..."
}
```
Action:
- calls on-chain `seal_universe`

---

## DB Schema (Minimal)

`universes`
- `id`
- `headline`
- `chain_universe_id`
- `status`
- `final_story`
- `final_story_hash`
- `created_by`
- `created_at`

`scenarios`
- `id`
- `universe_id`
- `chain_scenario_id`
- `question`
- `options_json`
- `phase`
- `winning_choice`
- `vote_counts_json`
- `created_at`

`ai_runs`
- `id`
- `universe_id`
- `agent_name`
- `input_json`
- `output_json`
- `model`
- `prompt_version`
- `created_at`

---

## UX Flow

1. Admin enters headline.
2. `ScenarioPlannerAgent` returns scenario set.
3. Admin edits/approves.
4. Publish on-chain.
5. Users vote scenario-by-scenario.
6. Admin reveals + resolves each scenario.
7. Once all resolved, generate final narrative.
8. Seal narrative hash on-chain.

---

## Non-Negotiable Reliability Rules

- If AI generation fails, app still works with manual scenario entry.
- If final narrative generation fails, app shows deterministic fallback summary.
- Never block on-chain resolve due to AI errors.
- Persist prompt version and model on every AI run for replay/debug.

---

## Security + Abuse Controls

- Admin-only endpoints for publish/seal operations.
- Wallet signature verification for admin actions.
- Rate-limit AI endpoints.
- Content moderation pass before storing public narrative.
- Hard schema validation on AI outputs (zod).

---

## Milestones

### Milestone A (Contract + Basic Multi-Scenario UI)
- Universe + scenario on-chain model
- Multiple scenario voting and resolution
- No AI yet

### Milestone B (AI Scenario Drafts)
- `ScenarioPlannerAgent` + admin approve flow

### Milestone C (AI Final Narrative + Seal)
- `NarrativeComposerAgent`
- story hash sealing

### Milestone D (Polish)
- better timeline view
- regenerate/edit narrative
- observability for AI runs

---

## Acceptance Criteria

- Create one universe with at least 3 scenarios.
- Users can vote independently in each scenario.
- All scenarios can be resolved independently.
- Final narrative includes all scenario winners.
- Narrative hash sealed on-chain.
- AI failures degrade gracefully without blocking core flow.
