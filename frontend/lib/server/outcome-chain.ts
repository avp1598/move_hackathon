import {
  Account,
  Aptos,
  AptosConfig,
  type EntryFunctionArgumentTypes,
  Ed25519PrivateKey,
  Network,
  type SimpleEntryFunctionArgumentTypes,
  type CommittedTransactionResponse,
} from "@aptos-labs/ts-sdk";

const DEFAULT_MODULE_ADDRESS =
  "0xdd525d357675655d18cecf68c3a7f29de3cda46ba4e4d0065ac9debdb8982575";

const DEFAULT_NETWORK = {
  fullnode: "https://mainnet.movementnetwork.xyz/v1",
};

export interface ScenarioPublishInput {
  question: string;
  options: [string, string, string, string];
}

export interface ChainScenarioState {
  id: number;
  universeId: number;
  question: string;
  choices: string[];
  phase: number;
  totalVotes: number;
  winningChoice: number;
  voteCounts: number[];
}

export interface ChainUniverseState {
  id: number;
  headline: string;
  scenarioIds: number[];
  status: number;
  finalStoryHash: string;
  admin: string;
  scenarios: ChainScenarioState[];
}

interface ParsedEvent<T> {
  txHash: string;
  data: T;
}

function getModuleAddress(): string {
  return process.env.NEXT_PUBLIC_OUTCOME_MODULE_ADDRESS ?? DEFAULT_MODULE_ADDRESS;
}

function getModuleName(): string {
  return process.env.NEXT_PUBLIC_MODULE_NAME ?? "outcome_fi";
}

function getFullnodeUrl(): string {
  return process.env.NEXT_PUBLIC_MOVEMENT_FULLNODE_URL ?? DEFAULT_NETWORK.fullnode;
}

function getAptosClient(): Aptos {
  const config = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: getFullnodeUrl(),
  });
  return new Aptos(config);
}

function outcomeFunction(functionName: string): `${string}::${string}::${string}` {
  return `${getModuleAddress()}::${getModuleName()}::${functionName}`;
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

function unwrapTuple(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  if (value.length === 1 && Array.isArray(value[0])) {
    return value[0] as unknown[];
  }
  return value;
}

function getAdminAccount(): Account {
  const privateKey = process.env.OUTCOME_ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("OUTCOME_ADMIN_PRIVATE_KEY is required for admin-signed chain actions.");
  }

  const key = new Ed25519PrivateKey(privateKey);
  const account = Account.fromPrivateKey({
    privateKey: key,
    legacy: true,
  });

  const expectedAddress = getModuleAddress().toLowerCase();
  if (account.accountAddress.toString().toLowerCase() !== expectedAddress) {
    throw new Error(
      `Admin key address ${account.accountAddress.toString()} does not match module address ${getModuleAddress()}.`
    );
  }

  return account;
}

function parseEventBySuffix<T>(
  tx: CommittedTransactionResponse,
  eventSuffix: string
): ParsedEvent<T> {
  const txHash = "hash" in tx ? String(tx.hash) : "";
  const events = "events" in tx && Array.isArray(tx.events) ? tx.events : [];
  const event = events.find((item) => String(item.type).endsWith(eventSuffix));
  if (!event) {
    throw new Error(`Missing expected event ${eventSuffix} on transaction ${txHash}`);
  }

  return {
    txHash,
    data: event.data as T,
  };
}

async function submitAdminEntry(
  functionName: string,
  functionArguments: Array<EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes>
): Promise<CommittedTransactionResponse> {
  const aptos = getAptosClient();
  const admin = getAdminAccount();

  const transaction = await aptos.transaction.build.simple({
    sender: admin.accountAddress,
    data: {
      function: outcomeFunction(functionName),
      functionArguments,
    },
  });

  const submitted = await aptos.signAndSubmitTransaction({
    signer: admin,
    transaction,
  });

  return aptos.waitForTransaction({
    transactionHash: submitted.hash,
    options: {
      checkSuccess: true,
      timeoutSecs: 180,
    },
  });
}

async function fetchScenario(aptos: Aptos, scenarioId: number): Promise<ChainScenarioState> {
  const [scenarioResponse, voteCountsResponse] = await Promise.all([
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
  const voteCountsTuple = unwrapTuple(voteCountsResponse);
  const votePayload =
    voteCountsTuple.length === 1 && Array.isArray(voteCountsTuple[0]) ? voteCountsTuple[0] : voteCountsTuple;

  if (scenarioTuple.length < 7) {
    throw new Error(`Invalid get_scenario response for scenario ${scenarioId}`);
  }

  return {
    id: toNumber(scenarioTuple[0]),
    universeId: toNumber(scenarioTuple[1]),
    question: String(scenarioTuple[2]),
    choices: toStringArray(scenarioTuple[3]),
    phase: toNumber(scenarioTuple[4]),
    totalVotes: toNumber(scenarioTuple[5]),
    winningChoice: toNumber(scenarioTuple[6]),
    voteCounts: toNumberArray(votePayload),
  };
}

export async function fetchChainUniverseState(universeId: number): Promise<ChainUniverseState> {
  const aptos = getAptosClient();
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
  const scenarioIdsTuple = unwrapTuple(scenarioIdsResponse);
  const scenarioIdPayload =
    scenarioIdsTuple.length === 1 && Array.isArray(scenarioIdsTuple[0]) ? scenarioIdsTuple[0] : scenarioIdsTuple;
  const scenarioIds = toNumberArray(scenarioIdPayload);

  if (universeTuple.length < 6) {
    throw new Error(`Invalid get_universe response for universe ${universeId}`);
  }

  const scenarios = await Promise.all(scenarioIds.map((scenarioId) => fetchScenario(aptos, scenarioId)));

  return {
    id: toNumber(universeTuple[0]),
    headline: String(universeTuple[1]),
    scenarioIds,
    status: toNumber(universeTuple[3]),
    finalStoryHash: String(universeTuple[4]),
    admin: String(universeTuple[5]),
    scenarios,
  };
}

export async function createUniverseOnChain(headline: string): Promise<{
  chainUniverseId: number;
  txHash: string;
}> {
  const tx = await submitAdminEntry("create_universe", [headline]);
  const created = parseEventBySuffix<{ universe_id: string | number }>(tx, "::UniverseCreated");

  return {
    chainUniverseId: toNumber(created.data.universe_id),
    txHash: created.txHash,
  };
}

export async function addScenarioOnChain(
  chainUniverseId: number,
  scenario: ScenarioPublishInput
): Promise<{
  chainScenarioId: number;
  txHash: string;
}> {
  const tx = await submitAdminEntry("add_scenario", [
    chainUniverseId,
    scenario.question,
    scenario.options[0],
    scenario.options[1],
    scenario.options[2],
    scenario.options[3],
  ]);

  const created = parseEventBySuffix<{ scenario_id: string | number }>(tx, "::ScenarioAdded");
  return {
    chainScenarioId: toNumber(created.data.scenario_id),
    txHash: created.txHash,
  };
}

export async function sealUniverseOnChain({
  chainUniverseId,
  storyHash,
}: {
  chainUniverseId: number;
  storyHash: string;
}): Promise<{ txHash: string }> {
  const tx = await submitAdminEntry("seal_universe", [chainUniverseId, storyHash]);
  return { txHash: tx.hash };
}
