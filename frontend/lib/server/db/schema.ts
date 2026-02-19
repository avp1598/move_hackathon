import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const universes = sqliteTable("universes", {
  id: text("id").primaryKey(),
  headline: text("headline").notNull(),
  chainUniverseId: integer("chain_universe_id"),
  status: text("status").notNull(),
  finalStory: text("final_story"),
  finalStoryHash: text("final_story_hash"),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const scenarios = sqliteTable("scenarios", {
  id: text("id").primaryKey(),
  universeId: text("universe_id")
    .notNull()
    .references(() => universes.id, { onDelete: "cascade" }),
  chainScenarioId: integer("chain_scenario_id"),
  question: text("question").notNull(),
  optionsJson: text("options_json").notNull(),
  rationale: text("rationale"),
  phase: integer("phase").notNull(),
  winningChoice: integer("winning_choice"),
  voteCountsJson: text("vote_counts_json").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const aiRuns = sqliteTable("ai_runs", {
  id: text("id").primaryKey(),
  universeId: text("universe_id").references(() => universes.id, { onDelete: "set null" }),
  agentName: text("agent_name").notNull(),
  inputJson: text("input_json").notNull(),
  outputJson: text("output_json").notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  createdAt: integer("created_at").notNull(),
});

export type UniverseRow = typeof universes.$inferSelect;
export type ScenarioRow = typeof scenarios.$inferSelect;
export type AiRunRow = typeof aiRuns.$inferSelect;
