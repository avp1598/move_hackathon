import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

export type ScenarioPhase = 0 | 1 | 2;
export type UniverseStatus = 0 | 1 | 2;
export type MoveFunctionId = `${string}::${string}::${string}`;

export interface ScenarioView {
  id: number;
  universeId: number;
  question: string;
  choices: string[];
  phase: ScenarioPhase;
  totalVotes: number;
  voteCounts: number[];
  winningChoice: number;
}

export interface UniverseView {
  id: number;
  headline: string;
  scenarioIds: number[];
  status: UniverseStatus;
  finalStoryHash: string;
  admin: string;
  scenarios: ScenarioView[];
}

interface MovementNetworkConfig {
  chainId: number;
  label: string;
  fullnode: string;
  explorerNetwork: "mainnet" | "testnet";
}

const MOVEMENT_NETWORKS: Record<"mainnet" | "testnet", MovementNetworkConfig> = {
  mainnet: {
    chainId: 126,
    label: "Movement Mainnet",
    fullnode: "https://mainnet.movementnetwork.xyz/v1",
    explorerNetwork: "mainnet",
  },
  testnet: {
    chainId: 250,
    label: "Movement Testnet",
    fullnode: "https://testnet.movementnetwork.xyz/v1",
    explorerNetwork: "testnet",
  },
};

const DEFAULT_MODULE_ADDRESS =
  "0xdd525d357675655d18cecf68c3a7f29de3cda46ba4e4d0065ac9debdb8982575";

const DEFAULT_UNIVERSE_ID = Number(process.env.NEXT_PUBLIC_DEFAULT_UNIVERSE_ID ?? "0");

export const OUTCOME_CONFIG = {
  moduleAddress: process.env.NEXT_PUBLIC_OUTCOME_MODULE_ADDRESS ?? DEFAULT_MODULE_ADDRESS,
  moduleName: process.env.NEXT_PUBLIC_MODULE_NAME ?? "outcome_fi",
  defaultUniverseId: Number.isFinite(DEFAULT_UNIVERSE_ID) ? DEFAULT_UNIVERSE_ID : 0,
};

function unwrapTuple(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  if (value.length === 1 && Array.isArray(value[0])) {
    return value[0] as unknown[];
  }
  return value;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  return 0;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => toNumber(item));
}

function normalizeVotePayload(raw: unknown): unknown[] {
  const tuple = unwrapTuple(raw);
  if (tuple.length === 1 && Array.isArray(tuple[0])) return tuple[0] as unknown[];
  return tuple;
}

export function getNetworkConfig(chainId?: number): MovementNetworkConfig {
  if (chainId === MOVEMENT_NETWORKS.mainnet.chainId) {
    return MOVEMENT_NETWORKS.mainnet;
  }
  if (chainId === MOVEMENT_NETWORKS.testnet.chainId) {
    return MOVEMENT_NETWORKS.testnet;
  }
  return MOVEMENT_NETWORKS.mainnet;
}

export function getAptosClient(chainId?: number): Aptos {
  const networkConfig = getNetworkConfig(chainId);
  const config = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: networkConfig.fullnode,
  });
  return new Aptos(config);
}

export function outcomeFunction(functionName: string): MoveFunctionId {
  return `${OUTCOME_CONFIG.moduleAddress}::${OUTCOME_CONFIG.moduleName}::${functionName}` as MoveFunctionId;
}

export function explorerTxUrl(txHash: string, chainId?: number): string {
  const networkConfig = getNetworkConfig(chainId);
  return `https://explorer.movementnetwork.xyz/txn/${txHash}?network=${networkConfig.explorerNetwork}`;
}

export function getPhaseLabel(phase: ScenarioPhase): string {
  if (phase === 0) return "COMMIT PHASE";
  if (phase === 1) return "REVEAL PHASE";
  return "RESOLVED";
}

export function getUniverseStatusLabel(status: UniverseStatus): string {
  if (status === 0) return "OPEN";
  if (status === 1) return "PARTIAL";
  return "COMPLETE";
}

export async function fetchScenarioById(aptos: Aptos, scenarioId: number): Promise<ScenarioView> {
  const [scenarioResponse, voteCountResponse] = await Promise.all([
    aptos.view({
      payload: {
        function: outcomeFunction("get_scenario"),
        functionArguments: [scenarioId],
      },
    }),
    aptos.view({
      payload: {
        function: outcomeFunction("get_vote_counts"),
        functionArguments: [scenarioId],
      },
    }),
  ]);

  const scenarioTuple = unwrapTuple(scenarioResponse);
  const voteCounts = toNumberArray(normalizeVotePayload(voteCountResponse));

  if (scenarioTuple.length < 7) {
    throw new Error(`Invalid get_scenario response for scenario ${scenarioId}`);
  }

  return {
    id: toNumber(scenarioTuple[0]),
    universeId: toNumber(scenarioTuple[1]),
    question: String(scenarioTuple[2]),
    choices: toStringArray(scenarioTuple[3]),
    phase: toNumber(scenarioTuple[4]) as ScenarioPhase,
    totalVotes: toNumber(scenarioTuple[5]),
    winningChoice: toNumber(scenarioTuple[6]),
    voteCounts,
  };
}

export async function fetchUniverseById(aptos: Aptos, universeId: number): Promise<UniverseView> {
  const [universeResponse, scenarioIdsResponse] = await Promise.all([
    aptos.view({
      payload: {
        function: outcomeFunction("get_universe"),
        functionArguments: [universeId],
      },
    }),
    aptos.view({
      payload: {
        function: outcomeFunction("list_universe_scenarios"),
        functionArguments: [universeId],
      },
    }),
  ]);

  const universeTuple = unwrapTuple(universeResponse);
  if (universeTuple.length < 6) {
    throw new Error(`Invalid get_universe response for universe ${universeId}`);
  }

  const scenarioIdPayload = normalizeVotePayload(scenarioIdsResponse);
  const scenarioIds = toNumberArray(scenarioIdPayload);
  const scenarios = await Promise.all(scenarioIds.map((scenarioId) => fetchScenarioById(aptos, scenarioId)));

  return {
    id: toNumber(universeTuple[0]),
    headline: String(universeTuple[1]),
    scenarioIds,
    status: toNumber(universeTuple[3]) as UniverseStatus,
    finalStoryHash: String(universeTuple[4]),
    admin: String(universeTuple[5]),
    scenarios,
  };
}

export async function fetchHasVotedInScenario(
  aptos: Aptos,
  address: string,
  scenarioId: number
): Promise<boolean> {
  const result = await aptos.view({
    payload: {
      function: outcomeFunction("has_voted_in_scenario"),
      functionArguments: [address, scenarioId],
    },
  });

  const tuple = unwrapTuple(result);
  if (tuple.length === 0) return false;
  return Boolean(tuple[0]);
}

export function isAdminAddress(address?: string): boolean {
  if (!address) return false;
  return address.toLowerCase() === OUTCOME_CONFIG.moduleAddress.toLowerCase();
}
