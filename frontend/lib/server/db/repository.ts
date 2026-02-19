import { randomUUID } from "node:crypto";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { aiRuns, scenarios, type ScenarioRow, universes, type UniverseRow } from "@/lib/server/db/schema";

export type UniverseStatus = "DRAFT" | "OPEN" | "PARTIAL" | "COMPLETE";

export interface ScenarioDraftInput {
  question: string;
  options: string[];
  rationale?: string;
}

export interface ScenarioRecord {
  id: string;
  universeId: string;
  chainScenarioId: number | null;
  question: string;
  options: string[];
  rationale: string | null;
  phase: number;
  winningChoice: number | null;
  voteCounts: number[];
  createdAt: number;
  updatedAt: number;
}

export interface UniverseRecord {
  id: string;
  headline: string;
  chainUniverseId: number | null;
  status: UniverseStatus;
  finalStory: string | null;
  finalStoryHash: string | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface UniverseWithScenarios extends UniverseRecord {
  scenarios: ScenarioRecord[];
}

function nowMs(): number {
  return Date.now();
}

function parseJsonArray(value: string, fallback: string[]): string[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return fallback;
    return parsed.map((item) => String(item));
  } catch {
    return fallback;
  }
}

function parseJsonNumberArray(value: string, fallback: number[]): number[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return fallback;
    return parsed.map((item) => Number(item) || 0);
  } catch {
    return fallback;
  }
}

function toUniverseRecord(row: UniverseRow): UniverseRecord {
  return {
    id: row.id,
    headline: row.headline,
    chainUniverseId: row.chainUniverseId ?? null,
    status: row.status as UniverseStatus,
    finalStory: row.finalStory ?? null,
    finalStoryHash: row.finalStoryHash ?? null,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toScenarioRecord(row: ScenarioRow): ScenarioRecord {
  return {
    id: row.id,
    universeId: row.universeId,
    chainScenarioId: row.chainScenarioId ?? null,
    question: row.question,
    options: parseJsonArray(row.optionsJson, []),
    rationale: row.rationale ?? null,
    phase: row.phase,
    winningChoice: row.winningChoice ?? null,
    voteCounts: parseJsonNumberArray(row.voteCountsJson, [0, 0, 0, 0]),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createUniverseDraft({
  headline,
  createdBy,
}: {
  headline: string;
  createdBy: string;
}): UniverseRecord {
  const id = randomUUID();
  const timestamp = nowMs();

  db.insert(universes).values({
    id,
    headline,
    chainUniverseId: null,
    status: "DRAFT",
    finalStory: null,
    finalStoryHash: null,
    createdBy,
    createdAt: timestamp,
    updatedAt: timestamp,
  }).run();

  const row = db.select().from(universes).where(eq(universes.id, id)).get();
  if (!row) {
    throw new Error("Failed to create universe draft");
  }

  return toUniverseRecord(row);
}

export function getUniverseById(universeId: string): UniverseRecord | null {
  const row = db.select().from(universes).where(eq(universes.id, universeId)).get();
  return row ? toUniverseRecord(row) : null;
}

export function getUniverseByChainId(chainUniverseId: number): UniverseRecord | null {
  const row = db
    .select()
    .from(universes)
    .where(eq(universes.chainUniverseId, chainUniverseId))
    .get();
  return row ? toUniverseRecord(row) : null;
}

export function resolveUniverseReference(universeRef: string): UniverseRecord | null {
  if (/^\d+$/.test(universeRef)) {
    return getUniverseByChainId(Number(universeRef));
  }
  return getUniverseById(universeRef);
}

export function replaceDraftScenarios(universeId: string, drafts: ScenarioDraftInput[]): ScenarioRecord[] {
  const timestamp = nowMs();
  db.delete(scenarios).where(eq(scenarios.universeId, universeId)).run();

  for (const [index, draft] of drafts.entries()) {
    const itemTimestamp = timestamp + index;
    db.insert(scenarios).values({
      id: randomUUID(),
      universeId,
      chainScenarioId: null,
      question: draft.question,
      optionsJson: JSON.stringify(draft.options),
      rationale: draft.rationale ?? null,
      phase: 0,
      winningChoice: null,
      voteCountsJson: JSON.stringify([0, 0, 0, 0]),
      createdAt: itemTimestamp,
      updatedAt: itemTimestamp,
    }).run();
  }

  return listScenariosForUniverse(universeId);
}

export function listScenariosForUniverse(universeId: string): ScenarioRecord[] {
  const rows = db
    .select()
    .from(scenarios)
    .where(eq(scenarios.universeId, universeId))
    .orderBy(asc(scenarios.createdAt))
    .all();
  return rows.map(toScenarioRecord);
}

export function getUniverseWithScenarios(universeId: string): UniverseWithScenarios | null {
  const universe = getUniverseById(universeId);
  if (!universe) return null;
  return {
    ...universe,
    scenarios: listScenariosForUniverse(universeId),
  };
}

export function updateUniverseHeadline(universeId: string, headline: string): UniverseRecord {
  db
    .update(universes)
    .set({
      headline,
      updatedAt: nowMs(),
    })
    .where(eq(universes.id, universeId))
    .run();

  const updated = getUniverseById(universeId);
  if (!updated) {
    throw new Error("Universe not found after headline update");
  }
  return updated;
}

export function markUniversePublished({
  universeId,
  chainUniverseId,
}: {
  universeId: string;
  chainUniverseId: number;
}): UniverseRecord {
  const timestamp = nowMs();
  db
    .update(universes)
    .set({
      chainUniverseId,
      status: "OPEN",
      updatedAt: timestamp,
    })
    .where(eq(universes.id, universeId))
    .run();

  const updated = getUniverseById(universeId);
  if (!updated) {
    throw new Error("Universe not found after publish update");
  }
  return updated;
}

export function linkScenarioToChain({
  scenarioId,
  chainScenarioId,
}: {
  scenarioId: string;
  chainScenarioId: number;
}): ScenarioRecord {
  const timestamp = nowMs();
  db
    .update(scenarios)
    .set({
      chainScenarioId,
      updatedAt: timestamp,
    })
    .where(eq(scenarios.id, scenarioId))
    .run();

  const row = db.select().from(scenarios).where(eq(scenarios.id, scenarioId)).get();
  if (!row) {
    throw new Error("Scenario not found after chain link update");
  }
  return toScenarioRecord(row);
}

export function saveFinalNarrative({
  universeId,
  finalStory,
  finalStoryHash,
}: {
  universeId: string;
  finalStory: string;
  finalStoryHash: string;
}): UniverseRecord {
  db
    .update(universes)
    .set({
      finalStory,
      finalStoryHash,
      status: "PARTIAL",
      updatedAt: nowMs(),
    })
    .where(eq(universes.id, universeId))
    .run();

  const updated = getUniverseById(universeId);
  if (!updated) {
    throw new Error("Universe not found after saving narrative");
  }
  return updated;
}

export function markUniverseComplete(universeId: string, finalStoryHash: string): UniverseRecord {
  db
    .update(universes)
    .set({
      status: "COMPLETE",
      finalStoryHash,
      updatedAt: nowMs(),
    })
    .where(eq(universes.id, universeId))
    .run();

  const updated = getUniverseById(universeId);
  if (!updated) {
    throw new Error("Universe not found after completion update");
  }
  return updated;
}

export function recordAiRun({
  universeId,
  agentName,
  input,
  output,
  model,
  promptVersion,
}: {
  universeId: string | null;
  agentName: string;
  input: unknown;
  output: unknown;
  model: string;
  promptVersion: string;
}) {
  db.insert(aiRuns).values({
    id: randomUUID(),
    universeId,
    agentName,
    inputJson: JSON.stringify(input),
    outputJson: JSON.stringify(output),
    model,
    promptVersion,
    createdAt: nowMs(),
  }).run();
}

export function listUniverseByRecency(limit = 25): UniverseRecord[] {
  const rows = db.select().from(universes).orderBy(desc(universes.createdAt)).limit(limit).all();
  return rows.map(toUniverseRecord);
}
