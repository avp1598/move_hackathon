# outcome.fi — MVP Spec

**Tagline:** Bet on What If
**Track:** Build with an AI Agent on Movement Network
**Pitch:** Prediction markets for parallel universes. Market consensus becomes history. AI writes the timeline.

---

## The One-Liner

One scenario. Four choices. Blind commit phase → election-night reveal → AI writes the alternate history. Real on-chain votes on Movement testnet.

---

## What Makes This Different

Every other prediction market shows odds in real-time → users just follow the crowd → no real prediction, just bandwagoning.

outcome.fi uses an **election model**:

```
COMMIT PHASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Vote in secret. No odds visible.
Only total vote count shown.
Pure independent prediction.
Like casting your ballot privately.

REVEAL PHASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Results animate in live.
Bars count up like election night.
Watch the tally shift in real-time.

RESOLUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Consensus becomes canon.
AI writes the alternate history story.
Universe #001 sealed on-chain forever.
```

Second differentiator: **no oracle problem**. There is no "correct" real-world answer to verify against. The market consensus IS the truth. Users collectively write history.

---

## The Screen

One page. One active scenario. Three states.

### State 1 — Commit Phase

```
┌──────────────────────────────────────────────────────────┐
│  ◈ outcome.fi          Testnet    [Connect Wallet]       │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                                                          │
│  UNIVERSE #001  ·  COMMIT PHASE  ·  42 votes cast       │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  What if Ethereum was never created?                     │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  ○  Bitcoin becomes the only smart contract platform     │
│  ○  A rival team builds something even better            │
│  ○  DeFi never happens — crypto stays niche              │
│  ○  Satoshi adds smart contracts to Bitcoin himself      │
│                                                          │
│  Votes are sealed until reveal. No one knows the odds.  │
│                                                          │
│              [ Cast Your Vote — 0.01 MOVE ]             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- Total vote count visible, choice breakdown hidden
- After voting: "Your vote is sealed. Waiting for reveal." — button disabled
- Wallet not connected: prompt to connect first

### State 2 — Reveal Phase

Bars animate in from 0% to final values on mount, staggered, with the leading choice glowing.

```
┌──────────────────────────────────────────────────────────┐
│  UNIVERSE #001  ·  REVEAL PHASE                         │
│                                                          │
│  What if Ethereum was never created?                     │
│                                                          │
│  A  ████████████████░░░░░  48%  ·  20 votes  ← LEADING  │
│  B  ████████░░░░░░░░░░░░░  31%  ·  13 votes             │
│  C  ███░░░░░░░░░░░░░░░░░░  12%  ·   5 votes             │
│  D  ██░░░░░░░░░░░░░░░░░░░   9%  ·   4 votes             │
│                                                          │
│              [ Seal This Timeline ]                      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- "Seal This Timeline" is admin-only (shown only when connected as deployer address)

### State 3 — Resolution

Full-screen dark takeover. Story streams in word by word.

```
══════════════════════════════════════════════════════
  TIMELINE #001 HAS BEEN WRITTEN
══════════════════════════════════════════════════════

  Universe where: Bitcoin becomes the only smart
  contract platform

  ─────────────────────────────────────────────────

  [AI story streams in here, word by word, styled
   as an AP wire news article from that timeline]

  ─────────────────────────────────────────────────

  Sealed on Movement Network  ·  View on Explorer →
══════════════════════════════════════════════════════
```

---

## Smart Contract

New file: `contracts/sources/outcome_fi.move`

### Storage

```move
struct Scenario has key {
    question: String,
    choices: vector<String>,    // always 4
    phase: u8,                  // 0=COMMIT, 1=REVEAL, 2=RESOLVED
    vote_counts: vector<u64>,   // hidden during COMMIT phase
    total_votes: u64,           // visible during COMMIT phase
    winning_choice: u8,
    admin: address,
}

struct VoteReceipt has key {    // stored on voter's account
    choice: u8,
}
```

### Entry Functions

| Function | Who | Description |
|----------|-----|-------------|
| `initialize(question, a, b, c, d)` | admin | Creates scenario at admin's address |
| `vote(scenario_addr, choice)` | anyone | Casts blind vote, costs 0.01 MOVE |
| `advance_phase(scenario_addr)` | admin | COMMIT → REVEAL → RESOLVED |
| `resolve(scenario_addr)` | admin | Finds winner by highest count, sets phase to RESOLVED |

### View Functions

| Function | Returns | Notes |
|----------|---------|-------|
| `get_scenario(addr)` | `(question, choices, phase, total_votes)` | Always visible |
| `get_vote_counts(addr)` | `vector<u64>` | Returns zeros during COMMIT phase |
| `has_voted(voter)` | `bool` | Check if address has VoteReceipt |
| `get_winner(addr)` | `u8` | Only meaningful after RESOLVED |

### Events

```move
VoteCast        { voter: address, total_votes: u64 }
PhaseAdvanced   { new_phase: u8 }
TimelineResolved { winning_choice: u8, winning_text: String }
```

### Key Logic

- `vote()` transfers 0.01 MOVE (1,000,000 octas) from voter to scenario address
- `get_vote_counts()` returns `[0, 0, 0, 0]` while phase is COMMIT — hidden until reveal
- `resolve()` auto-determines winner: iterates vote_counts, picks highest
- `has_voted()` checks if `VoteReceipt` resource exists at voter address (prevents double-voting)

---

## Frontend Components

Five new components. Reuse existing wallet connection, shadcn/ui, and Aptos SDK setup.

### `components/scenario-card.tsx`
- Reads contract state via `get_scenario()` and `get_vote_counts()` on mount and every 5s
- Renders commit / reveal / resolved view based on `phase`
- Passes phase + data down to sub-components

### `components/vote-panel.tsx`
- Four radio-style choice buttons
- Calls `has_voted()` on load — if true, show "Vote sealed" state
- On selection + confirm: submits `vote()` transaction
- Shows loading state while tx is pending
- On success: toast + transition to "sealed" state

### `components/reveal-bars.tsx`
- Receives `counts: number[]` and `choices: string[]`
- On mount: animates each bar from 0 to final percentage with 150ms stagger per bar
- Highlights winning bar with a glow ring
- Shows percentage + raw vote count per choice

### `components/story-viewer.tsx`
- Full-screen overlay, dark background
- Fetches `POST /api/generate-story` and reads the streaming response
- Renders text word-by-word using `ReadableStream`
- Styled as a newspaper/wire report
- Footer: winning choice label + Movement explorer link for the resolve tx

### `app/api/generate-story/route.ts`
- Edge function
- Input: `{ question, winningChoice, allChoices, voteCounts }`
- Validated with zod
- Calls Claude API (`claude-opus-4-6`) with streaming enabled
- Returns `text/event-stream` response

---

## Claude Prompt

```
SYSTEM:
You are a journalist from an alternate timeline writing a breaking news story.
Write in AP wire style. Exactly 4 paragraphs:
1. The lede — what happened, stated as fact
2. Background — how it came to be
3. Reaction — quotes from figures in this universe
4. Implications — what this means for the world going forward

Under 280 words. Use specific names, dates, and details. Make it feel real.

USER:
The scenario: "{question}"
The alternate history that humanity voted into existence: "{winningChoice}"

Write the alternate history news article for Universe #001.
```

---

## Environment Variables

Add to `frontend/.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SCENARIO_ADDRESS=0x19e8061f2064bfdbfecd2994c013735ec9f6575328047af0dc6cfc2855efbcf6
NEXT_PUBLIC_MODULE_NAME=outcome_fi
```

---

## Pre-Seeding (Before the Hackathon)

### 1. Deploy the contract

```bash
cd contracts
movement move publish --named-addresses move_hackathon=0x19e8061f2064bfdbfecd2994c013735ec9f6575328047af0dc6cfc2855efbcf6
```

### 2. Initialize the scenario

```bash
movement move run \
  --function-id $ADDR::outcome_fi::initialize \
  --args \
    string:"What if Ethereum was never created?" \
    string:"Bitcoin becomes the only smart contract platform" \
    string:"A rival team builds something even better" \
    string:"DeFi never happens — crypto stays niche forever" \
    string:"Satoshi adds smart contracts to Bitcoin himself"
```

### 3. Plant 10–15 votes from test wallets

Use different funded testnet accounts to cast votes across all choices. This ensures the reveal animation looks dramatic (not 0 vs 0) and the demo feels live rather than empty.

---

## Build Order

| Time | Task |
|------|------|
| 0:00–0:45 | Write, compile, deploy `outcome_fi.move` |
| 0:45–1:30 | `scenario-card.tsx` — reads contract, renders all 3 phases |
| 1:30–2:15 | `vote-panel.tsx` — submits vote tx, handles `has_voted` |
| 2:15–3:00 | `reveal-bars.tsx` — animated bars, stagger, leading glow |
| 3:00–3:45 | API route + `story-viewer.tsx` — streaming AI story |
| 3:45–4:30 | Polish: dark theme, typography, full-screen resolution takeover |
| 4:30–5:00 | Pre-seed votes, rehearse demo, test end-to-end |

---

## The Demo Script (60 seconds)

1. "Every prediction market shows odds in real-time. Everyone just bets on the crowd. That's not prediction — that's following."
2. "outcome.fi uses the election model. Blind votes. Results revealed live. Like election night."
3. Show the scenario card, commit phase, 15 pre-seeded votes
4. Connect wallet, cast a vote live — tx confirms on Movement
5. "Now watch the election night moment." — trigger `advance_phase` from CLI
6. Bars animate in, crowd reacts, one choice wins
7. Trigger `resolve()` — full-screen takeover
8. Claude streams the alternate history story live in front of judges
9. "This story is now the canonical record of Universe #001, written by humans, sealed on Movement."

---

## What's Explicitly Out of Scope

- Multiple simultaneous scenarios
- Prize distribution / claimable winnings
- Persistent universes / timeline lore
- User-submitted scenarios
- Token economy
- NFT minting
- Cabal coordination system
- Mobile responsiveness beyond basic layout
