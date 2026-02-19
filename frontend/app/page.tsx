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
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10">
        <header className="rounded-xl border bg-card/70 p-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">outcome.fi</p>
              <h1 className="text-2xl font-semibold">Bet on What If</h1>
              <p className="text-sm text-muted-foreground">
                Blind voting on Movement. Consensus becomes canon.
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

        <ScenarioCard />

        <footer className="text-center text-xs text-muted-foreground">
          Scenario address: <span className="font-mono">{OUTCOME_CONFIG.scenarioAddress}</span>
        </footer>
      </main>
    </div>
  );
}
