"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletSelectionModal } from "@/components/wallet-selection-modal";
import { ScenarioCard } from "@/components/scenario-card";
import { getNetworkConfig, OUTCOME_CONFIG } from "@/lib/outcome-fi";

function truncateAddress(address?: string): string {
  if (!address) return "";
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const INFO_CARDS = [
  {
    id: "vision",
    label: "PRODUCT VISION",
    body: "outcome.fi is a parallel-universe prediction market. A headline creates an alternate reality, users bet on branching outcomes, and the winning outcomes are stitched into a final AI-written timeline. The final story hash is sealed on-chain as the canonical branch.",
  },
  {
    id: "loop",
    label: "ELECTION-STYLE MARKET LOOP",
    body: null,
    list: [
      "01 · COMMIT — vote privately on scenario outcomes",
      "02 · REVEAL — vote totals surface as ballots are counted",
      "03 · RESOLVE — highest-vote option becomes canonical per scenario",
      "04 · COMPOSE — backend writes a markdown news story from winners",
      "05 · SEAL — story hash written on-chain, universe finalised",
    ],
  },
  {
    id: "diff",
    label: "WHY THIS IS DIFFERENT",
    body: null,
    list: [
      "No real-time odds during commit — you can't just follow the crowd",
      "Consensus is the truth source, no external oracle dependency",
      "Markets produce a shared narrative artifact, not only numeric settlement",
      "Recurring universe drops keep prediction loops fast and episodic",
    ],
  },
  {
    id: "mvp",
    label: "MVP SCOPE",
    body: null,
    list: [
      "No production-grade payout engine or tokenised positions yet",
      "Admin-assisted lifecycle — not full permissionless governance",
      "No dispute/challenge arbitration window in current release",
      "No reputation weighting or anti-collusion scoring yet",
    ],
  },
  {
    id: "future",
    label: "FUTURE GOALS",
    body: null,
    list: [
      "Permissionless universe creation with stake-backed governance",
      "Economic primitives: positions, payouts, incentives, slashing",
      "Reputation-aware consensus and cross-universe analytics",
      "Provenance, source links, timeline replay, and archives",
    ],
  },
];

export default function Home() {
  const { account, connected, disconnect, network } = useWallet();
  const networkLabel = getNetworkConfig(network?.chainId).label;
  const accountAddress = account?.address?.toString();

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        background: "radial-gradient(ellipse 90% 55% at 20% 0%, #081628 0%, #030508 60%)",
      }}
    >
      {/* Background layers */}
      <div className="fixed inset-0 void-grid pointer-events-none" style={{ opacity: 0.7 }} />
      <div className="fixed inset-0 scanlines pointer-events-none" />
      <div className="scan-beacon" />

      {/* Page content */}
      <div className="relative z-10">
        <main className="mx-auto max-w-5xl px-4 pt-8 pb-20">

          {/* ─── HEADER ─────────────────────────────── */}
          <header className="flex flex-wrap items-center justify-between gap-4 mb-14 pb-5 border-b border-[rgba(0,255,163,0.1)]">
            <div className="animate-fade-up">
              <p
                className="font-mono text-[10px] tracking-[0.3em] uppercase mb-1"
                style={{ color: "rgba(0,255,163,0.45)", fontFamily: "var(--font-share-tech-mono)" }}
              >
                {"// ORACLE_SYSTEM_v0.1"}
              </p>
              <h1
                className="text-[3.25rem] font-black italic leading-none tracking-tight glitch-auto"
                style={{
                  fontFamily: "var(--font-barlow-condensed)",
                  color: "#00FFA3",
                  textShadow:
                    "0 0 8px rgba(0,255,163,0.9), 0 0 24px rgba(0,255,163,0.4), 0 0 60px rgba(0,255,163,0.15)",
                }}
              >
                OUTCOME.FI
              </h1>
              <p
                className="text-[10px] tracking-[0.2em] uppercase mt-1"
                style={{ color: "rgba(90,112,144,0.9)", fontFamily: "var(--font-share-tech-mono)" }}
              >
                PARALLEL UNIVERSE PREDICTION MARKETS · MOVEMENT NETWORK
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 animate-fade-up animate-fade-up-1">
              {/* Network badge */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 border"
                style={{
                  borderColor: "rgba(0,255,163,0.18)",
                  background: "rgba(0,255,163,0.04)",
                  fontFamily: "var(--font-share-tech-mono)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.1em",
                  color: "rgba(0,255,163,0.7)",
                }}
              >
                <span className="led led-green" />
                <span>{networkLabel.toUpperCase()}</span>
              </div>

              {connected ? (
                <>
                  <div
                    className="px-3 py-1.5 border"
                    style={{
                      borderColor: "rgba(0,255,163,0.12)",
                      fontFamily: "var(--font-share-tech-mono)",
                      fontSize: "0.7rem",
                      letterSpacing: "0.06em",
                      color: "rgba(0,255,163,0.6)",
                    }}
                  >
                    {truncateAddress(accountAddress)}
                  </div>
                  <button className="btn-ghost-neon" onClick={disconnect}>
                    DISCONNECT
                  </button>
                </>
              ) : (
                <WalletSelectionModal>
                  <button className="btn-neon">CONNECT WALLET</button>
                </WalletSelectionModal>
              )}
            </div>
          </header>

          {/* ─── HERO ──────────────────────────────── */}
          <section className="mb-16 relative animate-fade-up animate-fade-up-1">
            <div
              className="absolute -inset-8 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 60% 80% at 0% 50%, rgba(0,255,163,0.04) 0%, transparent 70%)",
              }}
            />
            <p
              className="mb-5"
              style={{
                fontFamily: "var(--font-share-tech-mono)",
                fontSize: "0.7rem",
                letterSpacing: "0.3em",
                color: "rgba(56,189,248,0.7)",
                textShadow: "0 0 10px rgba(56,189,248,0.4)",
              }}
            >
              › ENTER THE ORACLE
            </p>

            <div className="overflow-hidden">
              <h2
                className="leading-[0.9] tracking-tight mb-2"
                style={{
                  fontFamily: "var(--font-barlow-condensed)",
                  fontWeight: 900,
                  fontSize: "clamp(3.5rem, 10vw, 7.5rem)",
                  color: "#E2ECF8",
                  fontStyle: "italic",
                }}
              >
                BET ON
              </h2>
              <h2
                className="leading-[0.9] tracking-tight"
                style={{
                  fontFamily: "var(--font-barlow-condensed)",
                  fontWeight: 900,
                  fontSize: "clamp(3.5rem, 10vw, 7.5rem)",
                  color: "#E2ECF8",
                  fontStyle: "italic",
                }}
              >
                <span className="neon-glow">WHAT IF</span>
              </h2>
            </div>

            <p
              className="mt-7 max-w-lg leading-relaxed"
              style={{ color: "#5A7090", fontSize: "0.95rem" }}
            >
              A parallel-universe prediction market where your collective choices determine which
              timeline becomes canonical reality. Consensus is truth. The blockchain is the record.
            </p>

            <div
              className="mt-8 flex items-center gap-6"
              style={{
                fontFamily: "var(--font-share-tech-mono)",
                fontSize: "0.7rem",
                letterSpacing: "0.08em",
                color: "rgba(90,112,144,0.7)",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="led led-green" />
                <span>LIVE ON MOVEMENT</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="led led-amber" />
                <span>TESTNET</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="led led-dim" />
                <span>MAINNET SOON</span>
              </div>
            </div>
          </section>

          {/* ─── INFO GRID ─────────────────────────── */}
          <section className="grid md:grid-cols-2 gap-4 mb-16">
            {INFO_CARDS.map((card, i) => (
              <div
                key={card.id}
                className={`void-card p-5 ${card.id === "future" ? "md:col-span-2" : ""} animate-fade-up`}
                style={{ animationDelay: `${0.05 * (i + 2)}s` }}
              >
                <p
                  className="mb-3 flex items-center gap-2"
                  style={{
                    fontFamily: "var(--font-share-tech-mono)",
                    fontSize: "0.65rem",
                    letterSpacing: "0.18em",
                    color: "rgba(0,255,163,0.55)",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "#00FFA3",
                      boxShadow: "0 0 6px #00FFA3",
                    }}
                  />
                  {card.label}
                </p>

                {card.body ? (
                  <p
                    className="leading-relaxed"
                    style={{ color: "#7A94B8", fontSize: "0.875rem" }}
                  >
                    {card.body}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {card.list?.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2"
                        style={{ color: "#7A94B8", fontSize: "0.875rem" }}
                      >
                        <span
                          style={{
                            color: "rgba(0,255,163,0.4)",
                            fontFamily: "var(--font-share-tech-mono)",
                            fontSize: "0.7rem",
                            marginTop: "3px",
                            flexShrink: 0,
                          }}
                        >
                          ›
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>

          {/* ─── LIVE ORACLE ───────────────────────── */}
          <section className="animate-fade-up animate-fade-up-5">
            <div className="section-label mb-6">
              <div className="flex items-center gap-2.5">
                <span className="led led-green" />
                <span
                  style={{
                    fontFamily: "var(--font-share-tech-mono)",
                    fontSize: "0.7rem",
                    letterSpacing: "0.22em",
                    color: "#00FFA3",
                    textShadow: "0 0 10px rgba(0,255,163,0.5)",
                  }}
                >
                  LIVE ORACLE
                </span>
              </div>
            </div>
            <ScenarioCard />
          </section>

          {/* ─── FOOTER ────────────────────────────── */}
          <footer
            className="mt-16 pt-5 border-t flex flex-wrap items-center justify-between gap-3"
            style={{ borderColor: "rgba(0,255,163,0.08)" }}
          >
            <span
              style={{
                fontFamily: "var(--font-share-tech-mono)",
                fontSize: "0.65rem",
                letterSpacing: "0.12em",
                color: "rgba(90,112,144,0.5)",
              }}
            >
              OUTCOME.FI · MOVEMENT NETWORK · {new Date().getFullYear()}
            </span>
            <div
              className="flex flex-wrap items-center gap-4"
              style={{
                fontFamily: "var(--font-share-tech-mono)",
                fontSize: "0.65rem",
                letterSpacing: "0.06em",
                color: "rgba(90,112,144,0.5)",
              }}
            >
              <span>
                CONTRACT:{" "}
                <span style={{ color: "rgba(0,255,163,0.5)" }}>{OUTCOME_CONFIG.moduleAddress}</span>
              </span>
              <span>
                DEFAULT_UNIVERSE:{" "}
                <span style={{ color: "rgba(0,255,163,0.5)" }}>
                  #{OUTCOME_CONFIG.defaultUniverseId}
                </span>
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
