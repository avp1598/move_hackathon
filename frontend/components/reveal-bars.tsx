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
            <div className="flex items-center justify-between text-sm">
              <p className="font-medium">
                {String.fromCharCode(65 + index)}. {choice}
              </p>
              <p className="text-muted-foreground">
                {percentage}% · {voteCount} votes
              </p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isLeading ? "bg-primary" : "bg-primary/40"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
