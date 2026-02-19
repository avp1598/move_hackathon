"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
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
  type ScenarioPhase,
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

function PhaseBadge({ phase }: { phase: ScenarioPhase }) {
  const label = getPhaseLabel(phase);
  const cls =
    phase === 0 ? "phase-commit" : phase === 1 ? "phase-reveal" : "phase-resolved";
  const led =
    phase === 0 ? "led-dim" : phase === 1 ? "led-amber" : "led-hot";

  return (
    <span className={`phase-badge ${cls} flex items-center gap-1.5`}>
      <span className={`led ${led}`} style={{ width: 5, height: 5 }} />
      {label.toUpperCase()}
    </span>
  );
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
    <div className="space-y-4">
      {/* ─── UNIVERSE LOADER ─────────────────────── */}
      <div
        className="void-card p-4"
        style={{ background: "linear-gradient(145deg, #060A14 0%, #04070F 100%)" }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              style={{
                fontFamily: "var(--font-share-tech-mono)",
                fontSize: "0.65rem",
                letterSpacing: "0.2em",
                color: "rgba(0,255,163,0.5)",
              }}
            >
              UNIVERSE_STATE
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-share-tech-mono)",
              fontSize: "0.6rem",
              letterSpacing: "0.08em",
              color: "rgba(56,189,248,0.5)",
            }}
          >
            POLL /{POLL_INTERVAL_MS / 1000}s
          </div>
        </div>

        {/* Universe ID input */}
        <div className="flex items-center gap-2">
          <span
            style={{
              fontFamily: "var(--font-share-tech-mono)",
              fontSize: "0.7rem",
              color: "rgba(0,255,163,0.5)",
              letterSpacing: "0.08em",
            }}
          >
            UNIVERSE #
          </span>
          <input
            className="universe-input flex-1"
            value={universeIdInput}
            onChange={(e) => setUniverseIdInput(e.target.value)}
            placeholder="ID"
            onKeyDown={(e) => {
              if (e.key === "Enter") loadUniverseByInput();
            }}
          />
          <button className="btn-ghost-neon" onClick={loadUniverseByInput}>
            LOAD
          </button>
          <button
            className="btn-ghost-neon"
            onClick={() => refreshUniverse()}
            disabled={isLoadingUniverse}
          >
            {isLoadingUniverse ? "SYNCING..." : "REFRESH"}
          </button>
        </div>

        {/* Status messages */}
        {isLoadingUniverse && !universe && (
          <div
            className="mt-4 flex items-center gap-2"
            style={{
              fontFamily: "var(--font-share-tech-mono)",
              fontSize: "0.7rem",
              color: "rgba(56,189,248,0.7)",
            }}
          >
            <span className="led led-amber" />
            FETCHING CHAIN STATE...
          </div>
        )}
        {loadError && (
          <p
            className="mt-4"
            style={{
              fontFamily: "var(--font-share-tech-mono)",
              fontSize: "0.7rem",
              color: "#FF2060",
            }}
          >
            ✗ {loadError}
          </p>
        )}
      </div>

      {/* ─── UNIVERSE DATA ────────────────────────── */}
      {universe && (
        <div className="space-y-4">
          {/* Universe header */}
          <div className="status-panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <span
                style={{
                  fontFamily: "var(--font-share-tech-mono)",
                  fontSize: "0.65rem",
                  letterSpacing: "0.15em",
                  color: "rgba(0,255,163,0.5)",
                }}
              >
                UNIVERSE #{universe.id} ·{" "}
                {universe.scenarioIds.length} SCENARIOS
              </span>
              <span
                className="flex items-center gap-1.5"
                style={{
                  fontFamily: "var(--font-share-tech-mono)",
                  fontSize: "0.65rem",
                  letterSpacing: "0.1em",
                  color:
                    universe.status === 2
                      ? "#FF2060"
                      : universe.status === 1
                        ? "#F59E0B"
                        : "#00FFA3",
                }}
              >
                <span
                  className={`led ${universe.status === 2 ? "led-hot" : universe.status === 1 ? "led-amber" : "led-green"}`}
                  style={{ width: 5, height: 5 }}
                />
                {getUniverseStatusLabel(universe.status).toUpperCase()}
              </span>
            </div>
            <h3
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                fontSize: "1.4rem",
                fontWeight: 700,
                fontStyle: "italic",
                letterSpacing: "0.03em",
                color: "#DCE8F5",
                lineHeight: 1.2,
              }}
            >
              {universe.headline}
            </h3>
          </div>

          {/* Scenarios */}
          {universe.scenarios.map((scenario, scenarioIdx) => {
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
              <div
                key={scenario.id}
                className={`scenario-block p-5 ${scenario.phase === 2 ? "scenario-block-resolved" : ""}`}
                style={{ animationDelay: `${scenarioIdx * 60}ms` }}
              >
                {/* Scenario header */}
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span
                    style={{
                      fontFamily: "var(--font-share-tech-mono)",
                      fontSize: "0.65rem",
                      letterSpacing: "0.15em",
                      color: "rgba(90,112,144,0.7)",
                    }}
                  >
                    SCENARIO_{String(scenario.id).padStart(3, "0")}
                  </span>
                  <PhaseBadge phase={scenario.phase} />
                  <span
                    style={{
                      fontFamily: "var(--font-share-tech-mono)",
                      fontSize: "0.65rem",
                      letterSpacing: "0.06em",
                      color: "rgba(56,189,248,0.6)",
                      marginLeft: "auto",
                    }}
                  >
                    {scenario.totalVotes.toLocaleString()} VOTES
                  </span>
                </div>

                {/* Question */}
                <p
                  className="mb-5"
                  style={{
                    fontFamily: "var(--font-barlow-condensed)",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    color: "#C8DFF0",
                    lineHeight: 1.3,
                  }}
                >
                  {scenario.question}
                </p>

                {/* Voting / Reveal content */}
                <div className="space-y-4">
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
                      <p
                        className="flex items-center gap-2 py-2"
                        style={{
                          fontFamily: "var(--font-share-tech-mono)",
                          fontSize: "0.7rem",
                          letterSpacing: "0.1em",
                          color: "rgba(56,189,248,0.6)",
                        }}
                      >
                        <span className="led led-dim" />
                        CONNECT WALLET TO VOTE
                      </p>
                    )
                  ) : (
                    <RevealBars choices={scenario.choices} counts={scenario.voteCounts} />
                  )}

                  {/* Winner display */}
                  {scenario.phase === 2 && (
                    <div className="flex items-center gap-3 pt-1">
                      <span className="winner-badge">
                        <span className="led led-hot" style={{ width: 5, height: 5 }} />
                        CANONICAL OUTCOME
                      </span>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "#FF2060",
                          textShadow: "0 0 12px rgba(255,32,96,0.4)",
                        }}
                      >
                        {winnerText}
                      </span>
                    </div>
                  )}

                  {/* Admin controls */}
                  {isAdmin && scenario.phase === 0 && (
                    <button
                      className="btn-ghost-neon w-full"
                      style={{ width: "100%", textAlign: "center" }}
                      onClick={() => handleAdvancePhase(scenario.id)}
                      disabled={isAdvancingScenario || isVotingScenario || isResolvingScenario}
                    >
                      {isAdvancingScenario ? "ADVANCING..." : "▶ ADVANCE TO REVEAL"}
                    </button>
                  )}

                  {isAdmin && scenario.phase === 1 && (
                    <button
                      className="btn-ghost-neon w-full"
                      style={{ width: "100%", textAlign: "center" }}
                      onClick={() => handleResolveScenario(scenario.id)}
                      disabled={isResolvingScenario || isVotingScenario || isAdvancingScenario}
                    >
                      {isResolvingScenario ? "RESOLVING..." : "▶ RESOLVE SCENARIO"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* ─── SEAL + NARRATIVE ───────────────────── */}
          <div className="void-card p-5 space-y-5">
            {/* Admin seal button */}
            {isAdmin && (
              <div className="flex items-center gap-3">
                <button
                  className="btn-neon"
                  onClick={handleSealUniverse}
                  disabled={
                    isSealingUniverse || !allScenariosResolved(universe) || universe.status === 2
                  }
                >
                  {isSealingUniverse ? "GENERATING + SEALING..." : "⬡ SEAL UNIVERSE"}
                </button>
                {universe.status === 2 && (
                  <span
                    className="flex items-center gap-1.5"
                    style={{
                      fontFamily: "var(--font-share-tech-mono)",
                      fontSize: "0.65rem",
                      letterSpacing: "0.1em",
                      color: "rgba(255,32,96,0.7)",
                    }}
                  >
                    <span className="led led-hot" style={{ width: 5, height: 5 }} />
                    UNIVERSE SEALED
                  </span>
                )}
              </div>
            )}

            {/* Narrative */}
            {narrativeStory && (
              <div>
                <p
                  className="mb-3 flex items-center gap-2"
                  style={{
                    fontFamily: "var(--font-share-tech-mono)",
                    fontSize: "0.65rem",
                    letterSpacing: "0.2em",
                    color: "rgba(0,255,163,0.5)",
                  }}
                >
                  <span className="led led-green" />
                  CANONICAL_TIMELINE
                </p>
                <div className="narrative-terminal terminal-cursor">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1>{children}</h1>,
                      h2: ({ children }) => <h2>{children}</h2>,
                      h3: ({ children }) => <h3>{children}</h3>,
                      p: ({ children }) => <p>{children}</p>,
                      li: ({ children }) => <li>{children}</li>,
                    }}
                  >
                    {narrativeStory}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── LAST TX HASH ─────────────────────────── */}
      {lastTxHash && (
        <a
          href={explorerTxUrl(lastTxHash, network?.chainId)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2"
          style={{
            fontFamily: "var(--font-share-tech-mono)",
            fontSize: "0.65rem",
            letterSpacing: "0.08em",
            color: "rgba(56,189,248,0.7)",
            textDecoration: "none",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "rgba(56,189,248,1)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "rgba(56,189,248,0.7)")
          }
        >
          <span className="led led-green" style={{ width: 5, height: 5 }} />
          VIEW TX ON EXPLORER ↗ {lastTxHash.slice(0, 10)}...{lastTxHash.slice(-6)}
        </a>
      )}
    </div>
  );
}
