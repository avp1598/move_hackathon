"use client";

interface RevealBarsProps {
  choices: string[];
  counts: number[];
}

export function RevealBars({ choices, counts }: RevealBarsProps) {
  const totalVotes = counts.reduce((sum, value) => sum + value, 0);
  const winnerVotes = Math.max(...counts, 0);

  return (
    <div className="space-y-4">
      {choices.map((choice, index) => {
        const voteCount = counts[index] ?? 0;
        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
        const isLeading = voteCount === winnerVotes && voteCount > 0;

        return (
          <div key={`${choice}-${index}`} className="space-y-2">
            {/* Label row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <span
                  className="flex-shrink-0 mt-0.5"
                  style={{
                    fontFamily: "var(--font-share-tech-mono)",
                    fontSize: "0.65rem",
                    letterSpacing: "0.06em",
                    color: isLeading ? "#00FFA3" : "rgba(0,255,163,0.35)",
                    background: isLeading ? "rgba(0,255,163,0.1)" : "rgba(0,255,163,0.04)",
                    border: `1px solid ${isLeading ? "rgba(0,255,163,0.35)" : "rgba(0,255,163,0.12)"}`,
                    padding: "2px 6px",
                    textShadow: isLeading ? "0 0 8px rgba(0,255,163,0.7)" : "none",
                  }}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                <span
                  className="leading-snug"
                  style={{
                    color: isLeading ? "#C8DFF0" : "#5A7090",
                    fontSize: "0.875rem",
                    fontWeight: isLeading ? 600 : 400,
                  }}
                >
                  {choice}
                </span>
              </div>

              <div className="flex-shrink-0 text-right">
                <span
                  style={{
                    fontFamily: "var(--font-share-tech-mono)",
                    fontSize: "0.75rem",
                    color: isLeading ? "#00FFA3" : "rgba(90,112,144,0.7)",
                    textShadow: isLeading ? "0 0 8px rgba(0,255,163,0.6)" : "none",
                    display: "block",
                  }}
                >
                  {percentage}%
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-share-tech-mono)",
                    fontSize: "0.6rem",
                    color: "rgba(90,112,144,0.5)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {voteCount.toLocaleString()} VOTES
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="data-bar-track" style={{ "--bar-delay": `${index * 80}ms` } as React.CSSProperties}>
              <div
                className={`data-bar-fill ${isLeading ? "data-bar-fill-lead" : "data-bar-fill-dim"}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
