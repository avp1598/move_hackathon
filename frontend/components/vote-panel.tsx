"use client";

import { Button } from "@/components/ui/button";

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
      <div className="space-y-3">
        {choices.map((choice, index) => {
          const isSelected = selectedChoice === index;

          return (
            <button
              key={`${choice}-${index}`}
              type="button"
              onClick={() => onSelect(index)}
              disabled={hasVoted || isSubmitting}
              className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              } ${hasVoted ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <span className="font-medium">
                {String.fromCharCode(65 + index)}. {choice}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">
        {hasVoted
          ? "Your vote is sealed. Waiting for reveal."
          : "Votes stay hidden until reveal. No live odds are shown during commit."}
      </p>

      <Button
        className="w-full"
        onClick={onSubmit}
        disabled={hasVoted || isSubmitting || selectedChoice === null}
      >
        {hasVoted ? "Vote Sealed" : isSubmitting ? "Casting Vote..." : "Cast Your Vote"}
      </Button>
    </div>
  );
}
