import { createHash } from "node:crypto";
import { generateObject, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import {
  createUniverseDraft,
  getUniverseById,
  recordAiRun,
  replaceDraftScenarios,
  resolveUniverseReference,
  saveFinalNarrative,
  type ScenarioDraftInput,
} from "@/lib/server/db/repository";
import { fetchChainUniverseState } from "@/lib/server/outcome-chain";

const SCENARIO_PROMPT_VERSION = "scenario_planner_v3_structured_fixed4";
const NARRATIVE_PROMPT_VERSION = "narrative_composer_v3_markdown";
const DEFAULT_MODEL = process.env.OUTCOME_AI_MODEL ?? "moonshotai/kimi-k2.5";
const FIXED_SCENARIO_COUNT = 4;

const openrouter = createOpenAI({
  name: "openrouter",
  baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    ...(process.env.OPENROUTER_SITE_URL
      ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL }
      : {}),
    ...(process.env.OPENROUTER_APP_NAME ? { "X-Title": process.env.OPENROUTER_APP_NAME } : {}),
  },
});

const ScenarioDraftSchema = z.object({
  question: z.string().min(12).max(220),
  options: z.array(z.string().min(3).max(180)).length(4),
  rationale: z.string().min(8).max(500),
});

const ScenarioDraftListSchema = z.array(ScenarioDraftSchema).length(FIXED_SCENARIO_COUNT);

const ScenarioPlanOutputSchema = z.object({
  scenarios: ScenarioDraftListSchema,
});

type ScenarioDraft = z.infer<typeof ScenarioDraftSchema>;

function normalizeText(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

function toScenarioDraftInput(draft: ScenarioDraft): ScenarioDraftInput {
  return {
    question: normalizeText(draft.question),
    options: draft.options.map((option) => normalizeText(option)),
    rationale: normalizeText(draft.rationale),
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return String(error);
}

function requireAiProviderKey(): void {
  if (!hasAiProviderKey()) {
    throw new Error("OPENROUTER_API_KEY is required. AI routes run in strict AI-only mode.");
  }
}

function computeStoryHash(story: string): string {
  return `0x${createHash("sha256").update(story).digest("hex")}`;
}

function hasAiProviderKey(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function getModelName(): string {
  return DEFAULT_MODEL;
}

async function collectResolvedScenariosForNarrative(
  universeRef: string
): Promise<Array<{ question: string; winningChoiceText: string; voteCounts: number[]; totalVotes: number }>> {
  const universe = resolveUniverseReference(universeRef);
  if (!universe) {
    throw new Error(`Universe ${universeRef} not found.`);
  }

  if (universe.chainUniverseId === null) {
    throw new Error(`Universe ${universeRef} is not published on-chain yet.`);
  }

  const chainState = await fetchChainUniverseState(universe.chainUniverseId);
  return chainState.scenarios
    .filter((scenario) => scenario.phase === 2)
    .map((scenario) => ({
      question: scenario.question,
      winningChoiceText:
        scenario.winningChoice >= 0 && scenario.winningChoice < scenario.choices.length
          ? scenario.choices[scenario.winningChoice]
          : "Unknown winner",
      voteCounts: scenario.voteCounts,
      totalVotes: scenario.totalVotes,
    }));
}

export async function draftUniverseScenariosWithAgent({
  headline,
  createdBy,
  tone,
}: {
  headline: string;
  createdBy: string;
  tone?: string;
}): Promise<{
  universeDraftId: string;
  scenarios: ScenarioDraftInput[];
  debug: {
    source: "ai";
    attempts: number;
    model: string;
    errors: string[];
  };
}> {
  requireAiProviderKey();
  const universe = createUniverseDraft({
    headline: normalizeText(headline),
    createdBy: normalizeText(createdBy),
  });

  const maxAttempts = 3;
  const attemptErrors: string[] = [];
  let drafts: ScenarioDraftInput[] | null = null;
  let attemptCount = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attemptCount = attempt;
    try {
      const result = await generateObject({
        model: openrouter(getModelName()),
        schema: ScenarioPlanOutputSchema,
        schemaName: "ScenarioPlanOutput",
        schemaDescription:
          "An object with scenarios: exactly 4 distinct scenario drafts, each containing one question, exactly four mutually-exclusive options, and a rationale.",
        temperature: 0.2,
        system: [
          "You are ScenarioPlannerAgent for outcome.fi Universe mode.",
          "Return strict JSON that matches the provided schema.",
          "Generate scenarios that are tightly connected to the headline and avoid duplication.",
          "Each scenario must have exactly 4 mutually-exclusive options.",
        ].join(" "),
        prompt: [
          `headline: ${universe.headline}`,
          `target_count_exact: ${FIXED_SCENARIO_COUNT}`,
          tone ? `tone/style constraints: ${normalizeText(tone)}` : "",
          `Return exactly ${FIXED_SCENARIO_COUNT} scenarios.`,
          attempt > 1
            ? `Retry context: previous attempt failed validation -> ${attemptErrors[attemptErrors.length - 1]}`
            : "",
          "Output only structured scenario drafts.",
        ]
          .filter(Boolean)
          .join("\n"),
      });

      drafts = result.object.scenarios.map(toScenarioDraftInput);
      break;
    } catch (error) {
      attemptErrors.push(`attempt ${attempt}: ${errorMessage(error)}`);
    }
  }

  if (!drafts) {
    throw new Error(
      `Scenario generation failed after ${maxAttempts} AI attempts. Last errors: ${attemptErrors.join(" | ")}`
    );
  }

  const stored = replaceDraftScenarios(universe.id, drafts);
  recordAiRun({
    universeId: universe.id,
    agentName: "ScenarioPlannerAgent",
    input: {
      headline: universe.headline,
      targetCount: FIXED_SCENARIO_COUNT,
      tone: tone ?? null,
    },
    output: {
      source: "ai",
      attempts: attemptCount,
      errors: attemptErrors,
      scenarios: stored,
    },
    model: getModelName(),
    promptVersion: SCENARIO_PROMPT_VERSION,
  });

  return {
    universeDraftId: universe.id,
    scenarios: stored.map((row) => ({
      question: row.question,
      options: row.options,
      rationale: row.rationale ?? "",
    })),
    debug: {
      source: "ai",
      attempts: attemptCount,
      model: getModelName(),
      errors: attemptErrors,
    },
  };
}

export async function composeUniverseNarrativeWithAgent({
  universeRef,
}: {
  universeRef: string;
}): Promise<{
  universeId: string;
  story: string;
  storyHash: string;
  metadata: {
    format: "markdown";
    winnerSummary: string[];
  };
  debug: {
    source: "ai";
    attempts: number;
    model: string;
    errors: string[];
  };
}> {
  requireAiProviderKey();
  const universe = resolveUniverseReference(universeRef);
  if (!universe) {
    throw new Error(`Universe ${universeRef} not found.`);
  }

  const resolved = await collectResolvedScenariosForNarrative(universeRef);
  if (resolved.length === 0) {
    throw new Error("Narrative generation requires at least one resolved scenario.");
  }

  const maxAttempts = 3;
  const attemptErrors: string[] = [];
  let story: string | null = null;
  const metadata = {
    format: "markdown" as const,
    winnerSummary: resolved.map((item) => item.winningChoiceText),
  };
  let attemptCount = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attemptCount = attempt;
    try {
      const result = await generateText({
        model: openrouter(getModelName()),
        temperature: 0.35,
        system: [
          "You are NarrativeComposerAgent for outcome.fi.",
          "Write a clear, coherent news-style story in markdown.",
          "Do not output JSON.",
          "Reference all resolved scenario winners in the narrative.",
          "Use markdown headings to structure the story.",
          "Do not present uncertain real-world claims as established facts.",
        ].join(" "),
        prompt: [
          `headline: ${universe.headline}`,
          "resolved_scenarios_json:",
          JSON.stringify(resolved, null, 2),
          "Output format requirements:",
          "- Markdown only",
          "- Include these sections:",
          "  ## Breaking Context",
          "  ## Market & Policy Reaction",
          "  ## Operational Fallout",
          "  ## Forward Outlook",
          attempt > 1
            ? `Retry context: previous attempt failed -> ${attemptErrors[attemptErrors.length - 1]}`
            : "",
        ].join("\n"),
      });

      const candidateStory = result.text.trim();
      if (candidateStory.length < 200) {
        attemptErrors.push(`attempt ${attempt}: story too short (${candidateStory.length} chars)`);
        continue;
      }

      story = candidateStory;
      break;
    } catch (error) {
      attemptErrors.push(`attempt ${attempt}: ${errorMessage(error)}`);
    }
  }

  if (!story) {
    throw new Error(
      `Narrative generation failed after ${maxAttempts} AI attempts. Last errors: ${attemptErrors.join(" | ")}`
    );
  }

  const storyHash = computeStoryHash(story);
  saveFinalNarrative({
    universeId: universe.id,
    finalStory: story,
    finalStoryHash: storyHash,
  });

  recordAiRun({
    universeId: universe.id,
    agentName: "NarrativeComposerAgent",
    input: {
      universeRef,
      headline: universe.headline,
      resolvedScenarioCount: resolved.length,
    },
    output: {
      source: "ai",
      attempts: attemptCount,
      errors: attemptErrors,
      story,
      storyHash,
      metadata,
    },
    model: getModelName(),
    promptVersion: NARRATIVE_PROMPT_VERSION,
  });

  return {
    universeId: universe.id,
    story,
    storyHash,
    metadata,
    debug: {
      source: "ai",
      attempts: attemptCount,
      model: getModelName(),
      errors: attemptErrors,
    },
  };
}

export function getUniverseForApi(universeId: string) {
  return getUniverseById(universeId);
}
