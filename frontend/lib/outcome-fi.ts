import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

export type ScenarioPhase = 0 | 1 | 2;
export type MoveFunctionId = `${string}::${string}::${string}`;

export interface ScenarioView {
  question: string;
  choices: string[];
  phase: ScenarioPhase;
  totalVotes: number;
  voteCounts: number[];
  winningChoice: number;
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
    fullnode: "https://full.mainnet.movementinfra.xyz/v1",
    explorerNetwork: "mainnet",
  },
  testnet: {
    chainId: 250,
    label: "Movement Testnet",
    fullnode: "https://full.testnet.movementinfra.xyz/v1",
    explorerNetwork: "testnet",
  },
};

const DEFAULT_MODULE_ADDRESS =
  "0x19e8061f2064bfdbfecd2994c013735ec9f6575328047af0dc6cfc2855efbcf6";

export const OUTCOME_CONFIG = {
  moduleAddress: process.env.NEXT_PUBLIC_OUTCOME_MODULE_ADDRESS ?? DEFAULT_MODULE_ADDRESS,
  moduleName: process.env.NEXT_PUBLIC_MODULE_NAME ?? "outcome_fi",
  scenarioAddress: process.env.NEXT_PUBLIC_SCENARIO_ADDRESS ?? DEFAULT_MODULE_ADDRESS,
};

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

export function getNetworkConfig(chainId?: number): MovementNetworkConfig {
  if (chainId === MOVEMENT_NETWORKS.mainnet.chainId) {
    return MOVEMENT_NETWORKS.mainnet;
  }
  return MOVEMENT_NETWORKS.testnet;
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

export async function fetchScenario(aptos: Aptos): Promise<ScenarioView> {
  const [scenarioResponse, voteCountResponse, winnerResponse] = await Promise.all([
    aptos.view({
      payload: {
        function: outcomeFunction("get_scenario"),
        functionArguments: [OUTCOME_CONFIG.scenarioAddress],
      },
    }),
    aptos.view({
      payload: {
        function: outcomeFunction("get_vote_counts"),
        functionArguments: [OUTCOME_CONFIG.scenarioAddress],
      },
    }),
    aptos
      .view({
        payload: {
          function: outcomeFunction("get_winner"),
          functionArguments: [OUTCOME_CONFIG.scenarioAddress],
        },
      })
      .catch(() => [255]),
  ]);

  if (!Array.isArray(scenarioResponse) || scenarioResponse.length < 4) {
    throw new Error("Invalid scenario response");
  }

  const votePayload =
    Array.isArray(voteCountResponse) &&
    voteCountResponse.length === 1 &&
    Array.isArray(voteCountResponse[0])
      ? voteCountResponse[0]
      : voteCountResponse;

  const winnerPayload =
    Array.isArray(winnerResponse) && winnerResponse.length > 0 ? winnerResponse[0] : 255;

  return {
    question: String(scenarioResponse[0]),
    choices: toStringArray(scenarioResponse[1]),
    phase: toNumber(scenarioResponse[2]) as ScenarioPhase,
    totalVotes: toNumber(scenarioResponse[3]),
    voteCounts: toNumberArray(votePayload),
    winningChoice: toNumber(winnerPayload),
  };
}

export async function fetchHasVoted(aptos: Aptos, address: string): Promise<boolean> {
  const result = await aptos.view({
    payload: {
      function: outcomeFunction("has_voted"),
      functionArguments: [address],
    },
  });

  if (!Array.isArray(result) || result.length === 0) return false;
  return Boolean(result[0]);
}

export function isAdminAddress(address?: string): boolean {
  if (!address) return false;
  return address.toLowerCase() === OUTCOME_CONFIG.scenarioAddress.toLowerCase();
}

export function buildCanonicalStory({
  question,
  winnerText,
  totalVotes,
}: {
  question: string;
  winnerText: string;
  totalVotes: number;
}): string {
  return [
    `Universe #001 was sealed after ${totalVotes} votes answered "${question}" with a clear mandate: "${winnerText}."`,
    `In this timeline, that outcome is treated as historical fact, and builders reorganize around it immediately.`,
    `Markets, media, and protocol teams now reference this vote as the origin event that reshaped the ecosystem.`,
    `Outcome.fi records this canonical branch on Movement, turning crowd consensus into a permanent timeline artifact.`,
  ].join("\n\n");
}
