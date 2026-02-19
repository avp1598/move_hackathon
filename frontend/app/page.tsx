"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletSelectionModal } from "@/components/wallet-selection-modal";
import { Button } from "@/components/ui/button";
import { ScenarioCard } from "@/components/scenario-card";
import { getNetworkConfig, OUTCOME_CONFIG } from "@/lib/outcome-fi";

function truncateAddress(address?: string): string {
  if (!address) return "";
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export default function Home() {
  const { account, connected, disconnect, network } = useWallet();
  const networkLabel = getNetworkConfig(network?.chainId).label;
  const accountAddress = account?.address?.toString();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/20">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-10">
        <header className="rounded-xl border bg-card/70 p-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">outcome.fi</p>
              <h1 className="text-2xl font-semibold">Bet on What If</h1>
              <p className="text-sm text-muted-foreground">
                Prediction markets for alternate realities where consensus becomes the canonical timeline.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border px-3 py-1 text-xs">{networkLabel}</span>
              {connected ? (
                <>
                  <span className="rounded-full border px-3 py-1 font-mono text-xs">
                    {truncateAddress(accountAddress)}
                  </span>
                  <Button variant="outline" size="sm" onClick={disconnect}>
                    Disconnect
                  </Button>
                </>
              ) : (
                <WalletSelectionModal>
                  <Button size="sm">Connect Wallet</Button>
                </WalletSelectionModal>
              )}
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border bg-card/70 p-5 backdrop-blur">
            <h2 className="text-lg font-semibold">Product Vision</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              outcome.fi is a parallel-universe prediction market. A headline creates an alternate reality, users bet
              on branching outcomes, and the winning outcomes are stitched into a final AI-written timeline. The final
              story hash is sealed on-chain as the canonical branch.
            </p>
          </article>

          <article className="rounded-xl border bg-card/70 p-5 backdrop-blur">
            <h2 className="text-lg font-semibold">Election-Style Market Loop</h2>
            <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>1. Commit phase: users vote privately on scenario outcomes.</li>
              <li>2. Reveal phase: vote totals become visible as ballots are counted.</li>
              <li>3. Resolution: highest-vote option becomes canonical outcome per scenario.</li>
              <li>4. Narrative: backend composes a markdown news story from resolved winners.</li>
              <li>5. Seal: story hash is written on-chain and universe is finalized.</li>
            </ol>
          </article>

          <article className="rounded-xl border bg-card/70 p-5 backdrop-blur">
            <h2 className="text-lg font-semibold">Why This Is Different</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>- No real-time odds feed during commit, so users cannot just follow the majority.</li>
              <li>- Consensus is the truth source, removing external oracle dependency for universe outcomes.</li>
              <li>- Markets produce a shared narrative artifact, not only a numeric settlement result.</li>
              <li>- Designed cadence: recurring universe drops to keep prediction loops fast and episodic.</li>
            </ul>
          </article>

          <article className="rounded-xl border bg-card/70 p-5 backdrop-blur">
            <h2 className="text-lg font-semibold">MVP Scope (Missing Today)</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>- No production-grade payout engine or tokenized position accounting yet.</li>
              <li>- Admin-assisted lifecycle (create/advance/resolve/seal), not full permissionless governance.</li>
              <li>- No formal dispute/challenge arbitration window in current release.</li>
              <li>- No deep reputation weighting or anti-collusion scoring layer yet.</li>
            </ul>
          </article>

          <article className="rounded-xl border bg-card/70 p-5 backdrop-blur">
            <h2 className="text-lg font-semibold">Future Goals</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>- Permissionless universe creation with stake-backed governance and dispute resolution.</li>
              <li>- Economic primitives: positions, payouts, incentives, slashing, and liquidity tooling.</li>
              <li>- Reputation-aware consensus and cross-universe forecasting analytics.</li>
              <li>- Richer narrative tooling: provenance, source links, timeline replay, and archives.</li>
            </ul>
          </article>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Live Product</h2>
          <p className="text-sm text-muted-foreground">
            Load a published universe by id, vote on scenarios, resolve outcomes, and seal the final narrative.
          </p>
          <ScenarioCard />
        </section>

        <footer className="text-center text-xs text-muted-foreground">
          Module address: <span className="font-mono">{OUTCOME_CONFIG.moduleAddress}</span> · Default universe:{" "}
          <span className="font-mono">#{OUTCOME_CONFIG.defaultUniverseId}</span>
        </footer>
      </main>
    </div>
  );
}
