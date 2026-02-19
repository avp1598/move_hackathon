import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/server/db/schema";

const DEFAULT_DB_PATH = "./.data/outcome-fi.sqlite";

function resolvedDbPath(): string {
  const configured = process.env.OUTCOME_DB_PATH ?? DEFAULT_DB_PATH;
  return resolve(process.cwd(), configured);
}

function ensureTables(client: BetterSqlite3.Database) {
  client.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 10000;

    CREATE TABLE IF NOT EXISTS universes (
      id TEXT PRIMARY KEY NOT NULL,
      headline TEXT NOT NULL,
      chain_universe_id INTEGER,
      status TEXT NOT NULL,
      final_story TEXT,
      final_story_hash TEXT,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS universes_chain_universe_id_idx
      ON universes(chain_universe_id);

    CREATE INDEX IF NOT EXISTS universes_status_idx
      ON universes(status);

    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY NOT NULL,
      universe_id TEXT NOT NULL,
      chain_scenario_id INTEGER,
      question TEXT NOT NULL,
      options_json TEXT NOT NULL,
      rationale TEXT,
      phase INTEGER NOT NULL,
      winning_choice INTEGER,
      vote_counts_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(universe_id) REFERENCES universes(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS scenarios_chain_scenario_id_idx
      ON scenarios(chain_scenario_id);

    CREATE INDEX IF NOT EXISTS scenarios_universe_id_idx
      ON scenarios(universe_id);

    CREATE TABLE IF NOT EXISTS ai_runs (
      id TEXT PRIMARY KEY NOT NULL,
      universe_id TEXT,
      agent_name TEXT NOT NULL,
      input_json TEXT NOT NULL,
      output_json TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(universe_id) REFERENCES universes(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS ai_runs_universe_id_idx
      ON ai_runs(universe_id);
  `);
}

function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

type DrizzleClient = ReturnType<typeof drizzle>;

declare global {
  var __outcomeSqliteClient: BetterSqlite3.Database | undefined;
  var __outcomeDrizzleClient: DrizzleClient | undefined;
}

function createClients(): { sqlite: BetterSqlite3.Database; db: DrizzleClient } {
  const dbFilePath = resolvedDbPath();
  mkdirSync(dirname(dbFilePath), { recursive: true });

  const sqlite = new BetterSqlite3(dbFilePath, { timeout: 10000 });
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      ensureTables(sqlite);
      break;
    } catch (error) {
      const isBusy = error instanceof Error && /SQLITE_BUSY|database is locked/i.test(error.message);
      const canRetry = attempt < 5;
      if (!isBusy || !canRetry) {
        throw error;
      }
      sleepSync(120 * (attempt + 1));
    }
  }

  const db = drizzle(sqlite, { schema });
  return { sqlite, db };
}

function getClients(): { sqlite: BetterSqlite3.Database; db: DrizzleClient } {
  if (globalThis.__outcomeSqliteClient && globalThis.__outcomeDrizzleClient) {
    return {
      sqlite: globalThis.__outcomeSqliteClient,
      db: globalThis.__outcomeDrizzleClient,
    };
  }

  const clients = createClients();
  globalThis.__outcomeSqliteClient = clients.sqlite;
  globalThis.__outcomeDrizzleClient = clients.db;
  return clients;
}

const clients = getClients();

export const sqliteClient = clients.sqlite;
export const db = clients.db;
