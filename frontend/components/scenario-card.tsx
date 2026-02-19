"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RevealBars } from "@/components/reveal-bars";
import { VotePanel } from "@/components/vote-panel";
import {
  explorerTxUrl,
  fetchHasVotedInScenario,
  fetchUniverseById,
  getAptosClient,
  getPhaseLabel,
  getUniverseStatusLabel,
  isAdminAddress,
  outcomeFunction,
  OUTCOME_CONFIG,
  type ScenarioView,
  type UniverseView,
} from "@/lib/outcome-fi";

const POLL_INTERVAL_MS = 6000;

function scenarioResolved(scenario: ScenarioView): boolean {
  return scenario.phase === 2;
}

function allScenariosResolved(universe: UniverseView | null): boolean {
  if (!universe || universe.scenarios.length === 0) return false;
  return universe.scenarios.every(scenarioResolved);
}

export function ScenarioCard() {
  const { account, connected, network, signAndSubmitTransaction } = useWallet();
  const accountAddress = account?.address?.toString();
  const aptos = useMemo(() => getAptosClient(network?.chainId), [network?.chainId]);
  const isAdmin = isAdminAddress(accountAddress);

  const [universeIdInput, setUniverseIdInput] = useState(String(OUTCOME_CONFIG.defaultUniverseId));
  const [activeUniverseId, setActiveUniverseId] = useState<number>(OUTCOME_CONFIG.defaultUniverseId);

  const [universe, setUniverse] = useState<UniverseView | null>(null);
  const [isLoadingUniverse, setIsLoadingUniverse] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedChoices, setSelectedChoices] = useState<Record<number, number | null>>({});
  const [hasVotedByScenario, setHasVotedByScenario] = useState<Record<number, boolean>>({});

  const [isVoting, setIsVoting] = useState<Record<number, boolean>>({});
  const [isAdvancing, setIsAdvancing] = useState<Record<number, boolean>>({});
  const [isResolving, setIsResolving] = useState<Record<number, boolean>>({});

  const [isSealingUniverse, setIsSealingUniverse] = useState(false);
  const [narrativeStory, setNarrativeStory] = useState<string | null>(null);

  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const refreshUniverse = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoadingUniverse(true);
      try {
        const nextUniverse = await fetchUniverseById(aptos, activeUniverseId);
        setUniverse(nextUniverse);
        setLoadError(null);

        try {
          const persisted = await fetch(`/api/universes/${activeUniverseId}`, {
            method: "GET",
            cache: "no-store",
          });
          if (persisted.ok) {
            const payload = await persisted.json();
            const story =
              typeof payload?.finalStory === "string" && payload.finalStory.trim().length > 0
                ? payload.finalStory
                : null;
            setNarrativeStory(story);
          } else {
            setNarrativeStory(null);
          }
        } catch {
          setNarrativeStory(null);
        }

        if (connected && accountAddress && nextUniverse.scenarios.length > 0) {
          const voteChecks = await Promise.all(
            nextUniverse.scenarios.map(async (scenario) => ({
              scenarioId: scenario.id,
              voted: await fetchHasVotedInScenario(aptos, accountAddress, scenario.id),
            }))
          );
          const voteMap: Record<number, boolean> = {};
          for (const item of voteChecks) {
            voteMap[item.scenarioId] = item.voted;
          }
          setHasVotedByScenario(voteMap);
        } else {
          setHasVotedByScenario({});
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load universe.";
        setLoadError(message);
      } finally {
        if (!silent) setIsLoadingUniverse(false);
      }
    },
    [accountAddress, activeUniverseId, aptos, connected]
  );

  useEffect(() => {
    refreshUniverse();
    const interval = setInterval(() => {
      refreshUniverse(true);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [refreshUniverse]);

  const loadUniverseByInput = useCallback(async () => {
    const parsed = Number(universeIdInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Enter a valid numeric universe id.");
      return;
    }
    setActiveUniverseId(Math.floor(parsed));
  }, [universeIdInput]);

  const handleVote = useCallback(
    async (scenarioId: number) => {
      const selected = selectedChoices[scenarioId];
      if (!connected || !account || selected === null || selected === undefined) return;

      setIsVoting((prev) => ({ ...prev, [scenarioId]: true }));
      const loadingToast = toast.loading(`Submitting vote for scenario #${scenarioId}...`);

      try {
        const response = await signAndSubmitTransaction({
          sender: account.address,
          data: {
            function: outcomeFunction("vote"),
            functionArguments: [scenarioId, selected],
          },
        });

        await aptos.waitForTransaction({ transactionHash: response.hash });
        setLastTxHash(response.hash);
        setHasVotedByScenario((prev) => ({ ...prev, [scenarioId]: true }));
        toast.success("Vote confirmed on Movement.", { id: loadingToast });
        await refreshUniverse(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to cast vote.";
        toast.error(message, { id: loadingToast });
      } finally {
        setIsVoting((prev) => ({ ...prev, [scenarioId]: false }));
      }
    },
    [account, aptos, connected, refreshUniverse, selectedChoices, signAndSubmitTransaction]
  );

  const handleAdvancePhase = useCallback(
    async (scenarioId: number) => {
      if (!connected || !account) return;
      setIsAdvancing((prev) => ({ ...prev, [scenarioId]: true }));
      const loadingToast = toast.loading(`Advancing scenario #${scenarioId}...`);

      try {
        const response = await signAndSubmitTransaction({
          sender: account.address,
          data: {
            function: outcomeFunction("advance_phase"),
            functionArguments: [scenarioId],
          },
        });
        await aptos.waitForTransaction({ transactionHash: response.hash });
        setLastTxHash(response.hash);
        toast.success(`Scenario #${scenarioId} moved to reveal.`, { id: loadingToast });
        await refreshUniverse(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to advance phase.";
        toast.error(message, { id: loadingToast });
      } finally {
        setIsAdvancing((prev) => ({ ...prev, [scenarioId]: false }));
      }
    },
    [account, aptos, connected, refreshUniverse, signAndSubmitTransaction]
  );

  const handleResolveScenario = useCallback(
    async (scenarioId: number) => {
      if (!connected || !account) return;
      setIsResolving((prev) => ({ ...prev, [scenarioId]: true }));
      const loadingToast = toast.loading(`Resolving scenario #${scenarioId}...`);

      try {
        const response = await signAndSubmitTransaction({
          sender: account.address,
          data: {
            function: outcomeFunction("resolve_scenario"),
            functionArguments: [scenarioId],
          },
        });
        await aptos.waitForTransaction({ transactionHash: response.hash });
        setLastTxHash(response.hash);
        toast.success(`Scenario #${scenarioId} resolved.`, { id: loadingToast });
        await refreshUniverse(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to resolve scenario.";
        toast.error(message, { id: loadingToast });
      } finally {
        setIsResolving((prev) => ({ ...prev, [scenarioId]: false }));
      }
    },
    [account, aptos, connected, refreshUniverse, signAndSubmitTransaction]
  );

  const handleSealUniverse = useCallback(async () => {
    const routeId = String(activeUniverseId);
    if (!routeId) {
      toast.error("No universe selected.");
      return;
    }

    setIsSealingUniverse(true);
    const loadingToast = toast.loading("Generating narrative and sealing universe...");
    try {
      const narrativeResponse = await fetch(`/api/ai/universes/${routeId}/generate-narrative`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ universeId: routeId }),
      });
      const narrativePayload = await narrativeResponse.json();
      if (!narrativeResponse.ok) {
        throw new Error(narrativePayload?.error ?? "Narrative generation failed.");
      }

      const storyHash = String(narrativePayload.storyHash);
      setNarrativeStory(String(narrativePayload.story));

      const sealResponse = await fetch(`/api/universes/${routeId}/seal`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storyHash }),
      });
      const sealPayload = await sealResponse.json();
      if (!sealResponse.ok) {
        throw new Error(sealPayload?.error ?? "Seal failed.");
      }

      setLastTxHash(String(sealPayload.txHash));
      toast.success("Universe sealed on-chain.", { id: loadingToast });
      await refreshUniverse(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate and seal.";
      toast.error(message, { id: loadingToast });
    } finally {
      setIsSealingUniverse(false);
    }
  }, [activeUniverseId, refreshUniverse]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Universe State</CardTitle>
          <CardDescription>Read and interact with a published universe by chain id.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={universeIdInput}
              onChange={(event) => setUniverseIdInput(event.target.value)}
              placeholder="Universe id"
            />
            <Button variant="outline" onClick={loadUniverseByInput}>
              Load
            </Button>
            <Button variant="outline" onClick={() => refreshUniverse()} disabled={isLoadingUniverse}>
              Refresh
            </Button>
          </div>

          {isLoadingUniverse && !universe ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}

          {universe ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Universe #{universe.id}</p>
                <p className="mt-1 text-lg font-semibold">{universe.headline}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Status: {getUniverseStatusLabel(universe.status)} · {universe.scenarioIds.length} scenarios
                </p>
              </div>

              {universe.scenarios.map((scenario) => {
                const hasVoted = Boolean(hasVotedByScenario[scenario.id]);
                const selectedChoice = selectedChoices[scenario.id] ?? null;
                const isVotingScenario = Boolean(isVoting[scenario.id]);
                const isAdvancingScenario = Boolean(isAdvancing[scenario.id]);
                const isResolvingScenario = Boolean(isResolving[scenario.id]);
                const winnerText =
                  scenario.winningChoice >= 0 && scenario.winningChoice < scenario.choices.length
                    ? scenario.choices[scenario.winningChoice]
                    : "Unknown winner";

                return (
                  <div key={scenario.id} className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Scenario #{scenario.id} · {getPhaseLabel(scenario.phase)}
                    </p>
                    <p className="mt-1 font-medium">{scenario.question}</p>
                    <p className="text-sm text-muted-foreground">{scenario.totalVotes} votes</p>

                    <div className="mt-4 space-y-4">
                      {scenario.phase === 0 ? (
                        connected ? (
                          <VotePanel
                            choices={scenario.choices}
                            selectedChoice={selectedChoice}
                            hasVoted={hasVoted}
                            isSubmitting={isVotingScenario}
                            onSelect={(choice) =>
                              setSelectedChoices((prev) => ({
                                ...prev,
                                [scenario.id]: choice,
                              }))
                            }
                            onSubmit={() => handleVote(scenario.id)}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">Connect a wallet to vote.</p>
                        )
                      ) : (
                        <RevealBars choices={scenario.choices} counts={scenario.voteCounts} />
                      )}

                      {scenario.phase === 2 ? (
                        <p className="text-sm font-medium">Winning option: {winnerText}</p>
                      ) : null}

                      {isAdmin && scenario.phase === 0 ? (
                        <Button
                          className="w-full"
                          onClick={() => handleAdvancePhase(scenario.id)}
                          disabled={isAdvancingScenario || isVotingScenario || isResolvingScenario}
                        >
                          {isAdvancingScenario ? "Advancing..." : "Advance To Reveal"}
                        </Button>
                      ) : null}

                      {isAdmin && scenario.phase === 1 ? (
                        <Button
                          className="w-full"
                          onClick={() => handleResolveScenario(scenario.id)}
                          disabled={isResolvingScenario || isVotingScenario || isAdvancingScenario}
                        >
                          {isResolvingScenario ? "Resolving..." : "Resolve Scenario"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap gap-2">
                  {isAdmin ? (
                    <Button
                      onClick={handleSealUniverse}
                      disabled={isSealingUniverse || !allScenariosResolved(universe) || universe.status === 2}
                    >
                      {isSealingUniverse ? "Generating + Sealing..." : "Seal Universe"}
                    </Button>
                  ) : null}
                </div>

                {narrativeStory ? (
                  <div className="rounded-md border bg-muted/30 p-4">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="text-xl font-semibold">{children}</h1>,
                        h2: ({ children }) => <h2 className="mt-4 text-lg font-semibold">{children}</h2>,
                        h3: ({ children }) => <h3 className="mt-3 text-base font-semibold">{children}</h3>,
                        p: ({ children }) => <p className="mt-2 text-sm leading-6">{children}</p>,
                        li: ({ children }) => <li className="ml-5 list-disc text-sm leading-6">{children}</li>,
                      }}
                    >
                      {narrativeStory}
                    </ReactMarkdown>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

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
    </div>
  );
}
