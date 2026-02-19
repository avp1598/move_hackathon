"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RevealBars } from "@/components/reveal-bars";
import { VotePanel } from "@/components/vote-panel";
import {
  buildCanonicalStory,
  explorerTxUrl,
  fetchHasVoted,
  fetchScenario,
  getAptosClient,
  getPhaseLabel,
  isAdminAddress,
  outcomeFunction,
  OUTCOME_CONFIG,
  ScenarioView,
} from "@/lib/outcome-fi";

const POLL_INTERVAL_MS = 5000;

export function ScenarioCard() {
  const { account, connected, network, signAndSubmitTransaction } = useWallet();
  const accountAddress = account?.address?.toString();
  const aptos = useMemo(() => getAptosClient(network?.chainId), [network?.chainId]);

  const [scenario, setScenario] = useState<ScenarioView | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const isAdmin = isAdminAddress(accountAddress);

  const refresh = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);

      try {
        const nextScenario = await fetchScenario(aptos);
        setScenario(nextScenario);
        setLoadError(null);

        if (connected && accountAddress) {
          const voted = await fetchHasVoted(aptos, accountAddress);
          setHasVoted(voted);
        } else {
          setHasVoted(false);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load scenario";
        setLoadError(message);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [accountAddress, aptos, connected]
  );

  useEffect(() => {
    refresh();
    const interval = setInterval(() => {
      refresh(true);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [refresh]);

  const handleVote = useCallback(async () => {
    if (!connected || !account || selectedChoice === null) return;
    setIsVoting(true);
    const loadingToast = toast.loading("Submitting vote...");

    try {
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: outcomeFunction("vote"),
          functionArguments: [OUTCOME_CONFIG.scenarioAddress, selectedChoice],
        },
      });

      toast.loading("Waiting for confirmation...", { id: loadingToast });
      await aptos.waitForTransaction({ transactionHash: response.hash });

      setLastTxHash(response.hash);
      setHasVoted(true);
      toast.success("Vote confirmed on Movement", { id: loadingToast });
      await refresh(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to cast vote";
      toast.error(message, { id: loadingToast });
    } finally {
      setIsVoting(false);
    }
  }, [account, aptos, connected, refresh, selectedChoice, signAndSubmitTransaction]);

  const handleAdvancePhase = useCallback(async () => {
    if (!connected || !account) return;
    setIsAdvancing(true);
    const loadingToast = toast.loading("Advancing phase...");

    try {
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: outcomeFunction("advance_phase"),
          functionArguments: [OUTCOME_CONFIG.scenarioAddress],
        },
      });

      await aptos.waitForTransaction({ transactionHash: response.hash });
      setLastTxHash(response.hash);
      toast.success("Scenario moved to Reveal phase", { id: loadingToast });
      await refresh(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to advance phase";
      toast.error(message, { id: loadingToast });
    } finally {
      setIsAdvancing(false);
    }
  }, [account, aptos, connected, refresh, signAndSubmitTransaction]);

  const handleResolve = useCallback(async () => {
    if (!connected || !account) return;
    setIsResolving(true);
    const loadingToast = toast.loading("Sealing timeline...");

    try {
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: outcomeFunction("resolve"),
          functionArguments: [OUTCOME_CONFIG.scenarioAddress],
        },
      });

      await aptos.waitForTransaction({ transactionHash: response.hash });
      setLastTxHash(response.hash);
      toast.success("Timeline sealed", { id: loadingToast });
      await refresh(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resolve timeline";
      toast.error(message, { id: loadingToast });
    } finally {
      setIsResolving(false);
    }
  }, [account, aptos, connected, refresh, signAndSubmitTransaction]);

  if (isLoading && !scenario) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Universe #001...</CardTitle>
          <CardDescription>Reading state from Movement testnet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!scenario) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scenario Not Initialized</CardTitle>
          <CardDescription>
            Could not read scenario at <span className="font-mono">{OUTCOME_CONFIG.scenarioAddress}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Run initialize once, then refresh this page.</p>
          {loadError ? <p className="text-destructive">{loadError}</p> : null}
          <Button variant="outline" onClick={() => refresh()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const winnerText =
    scenario.winningChoice >= 0 && scenario.winningChoice < scenario.choices.length
      ? scenario.choices[scenario.winningChoice]
      : "No winner selected";
  const story = buildCanonicalStory({
    question: scenario.question,
    winnerText,
    totalVotes: scenario.totalVotes,
  });

  return (
    <Card className={scenario.phase === 2 ? "border-primary bg-primary/5" : ""}>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>UNIVERSE #001 · {getPhaseLabel(scenario.phase)}</CardTitle>
            <CardDescription>{scenario.totalVotes} votes cast</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refresh(true)} disabled={isLoading}>
            Refresh
          </Button>
        </div>
        <p className="text-lg font-medium">{scenario.question}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {scenario.phase === 0 ? (
          connected ? (
            <VotePanel
              choices={scenario.choices}
              selectedChoice={selectedChoice}
              hasVoted={hasVoted}
              isSubmitting={isVoting}
              onSelect={setSelectedChoice}
              onSubmit={handleVote}
            />
          ) : (
            <p className="text-muted-foreground">Connect a wallet to cast a vote.</p>
          )
        ) : null}

        {scenario.phase >= 1 ? (
          <RevealBars choices={scenario.choices} counts={scenario.voteCounts} />
        ) : null}

        {scenario.phase === 2 ? (
          <div className="rounded-lg border border-primary/30 bg-background p-4">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">
              Timeline #001 Has Been Written
            </p>
            <p className="mt-2 font-semibold">Winning universe: {winnerText}</p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{story}</p>
          </div>
        ) : null}

        {isAdmin && scenario.phase === 0 ? (
          <Button
            className="w-full"
            onClick={handleAdvancePhase}
            disabled={isAdvancing || isVoting || isResolving}
          >
            {isAdvancing ? "Advancing..." : "Advance to Reveal"}
          </Button>
        ) : null}

        {isAdmin && scenario.phase === 1 ? (
          <Button
            className="w-full"
            onClick={handleResolve}
            disabled={isResolving || isVoting || isAdvancing}
          >
            {isResolving ? "Sealing..." : "Seal This Timeline"}
          </Button>
        ) : null}

        {lastTxHash ? (
          <a
            href={explorerTxUrl(lastTxHash, network?.chainId)}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-primary underline-offset-2 hover:underline"
          >
            View latest transaction on explorer →
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}
