"use client";

interface VotePanelProps {
  choices: string[];
  selectedChoice: number | null;
  hasVoted: boolean;
  isSubmitting: boolean;
  onSelect: (choiceIndex: number) => void;
  onSubmit: () => void;
}

export function VotePanel({
  choices,
  selectedChoice,
  hasVoted,
  isSubmitting,
  onSelect,
  onSubmit,
}: VotePanelProps) {
  return (
    <div className="space-y-4">
      {/* Choice buttons */}
      <div className="space-y-2">
        {choices.map((choice, index) => {
          const isSelected = selectedChoice === index;
          const letter = String.fromCharCode(65 + index);

          return (
            <button
              key={`${choice}-${index}`}
              type="button"
              onClick={() => onSelect(index)}
              disabled={hasVoted || isSubmitting}
              className={`choice-btn ${isSelected ? "selected" : ""}`}
            >
              <span className="choice-letter">{letter}</span>
              <span
                style={{
                  color: isSelected ? "#C8DFF0" : "#7A94B8",
                  fontSize: "0.875rem",
                  fontWeight: isSelected ? 600 : 400,
                  lineHeight: 1.4,
                }}
              >
                {choice}
              </span>
              {isSelected && (
                <span
                  className="ml-auto flex-shrink-0"
                  style={{
                    fontFamily: "var(--font-share-tech-mono)",
                    fontSize: "0.6rem",
                    color: "#00FFA3",
                    letterSpacing: "0.1em",
                    textShadow: "0 0 8px rgba(0,255,163,0.7)",
                  }}
                >
                  SELECTED
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Status message */}
      <p
        className="flex items-center gap-2"
        style={{
          fontFamily: "var(--font-share-tech-mono)",
          fontSize: "0.65rem",
          letterSpacing: "0.08em",
          color: hasVoted ? "rgba(0,255,163,0.6)" : "rgba(90,112,144,0.7)",
        }}
      >
        {hasVoted ? (
          <>
            <span className="led led-green" />
            VOTE SEALED · AWAITING REVEAL PHASE
          </>
        ) : (
          <>
            <span className="led led-dim" />
            VOTES STAY HIDDEN UNTIL REVEAL · NO LIVE ODDS SHOWN
          </>
        )}
      </p>

      {/* Submit button */}
      <button
        type="button"
        className="btn-neon w-full"
        onClick={onSubmit}
        disabled={hasVoted || isSubmitting || selectedChoice === null}
        style={{ width: "100%", textAlign: "center" }}
      >
        {hasVoted
          ? "▪ VOTE SEALED"
          : isSubmitting
            ? "CASTING VOTE..."
            : selectedChoice === null
              ? "SELECT AN OPTION"
              : "CAST YOUR VOTE →"}
      </button>
    </div>
  );
}
