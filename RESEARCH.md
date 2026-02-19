# Movement Network — Open Claw Hackathon Research

## Hackathon Overview
- **Date**: February 19, 2025 (5-hour in-person at ETH Denver)
- **Track chosen**: Track 1 — Build with an AI Agent
- **Requirement**: Deployed Move smart contract + frontend that interacts with it
- **Prize**: Mac Mini + swag

---

## Account Info (Bardock Testnet)
| Field | Value |
|-------|-------|
| Address | `0x19e8061f2064bfdbfecd2994c013735ec9f6575328047af0dc6cfc2855efbcf6` |
| Network | Testnet (Chain ID: 250) |
| Explorer | https://explorer.movementnetwork.xyz/account/0x19e8061f2064bfdbfecd2994c013735ec9f6575328047af0dc6cfc2855efbcf6?network=testnet |
| Faucet | https://faucet.movementlabs.xyz |

---

## Network Endpoints
| Network | RPC | Chain ID |
|---------|-----|----------|
| Testnet | `https://full.testnet.movementinfra.xyz/v1` | 250 |
| Mainnet | `https://full.mainnet.movementinfra.xyz/v1` | 126 |

---

## Key Commands

### Compile contract
```bash
cd contracts
movement move compile
```

### Run tests
```bash
cd contracts
movement move test
```

### Deploy to testnet
```bash
cd contracts
movement move publish --named-addresses move_hackathon=0x19e8061f2064bfdbfecd2994c013735ec9f6575328047af0dc6cfc2855efbcf6
```

### Call a function
```bash
movement move run \
  --function-id 0x19e8061f2064bfdbfecd2994c013735ec9f6575328047af0dc6cfc2855efbcf6::agent_registry::register \
  --args string:"MyAgent" string:"An AI agent on Movement"
```

### View a resource
```bash
movement move view \
  --function-id 0x19e8061f2064bfdbfecd2994c013735ec9f6575328047af0dc6cfc2855efbcf6::agent_registry::get_profile \
  --args address:0x19e8061f2064bfdbfecd2994c013735ec9f6575328047af0dc6cfc2855efbcf6
```

### Run frontend
```bash
cd frontend
bun run dev
```

---

## Move Language Basics

### Module structure
```move
module my_addr::my_module {
    use std::string::String;
    use std::signer;

    struct MyResource has key { value: u64 }

    public entry fun my_fn(account: &signer) { ... }

    #[view]
    public fun get_value(addr: address): u64 acquires MyResource { ... }
}
```

### Key abilities
| Ability | Meaning |
|---------|---------|
| `key` | Can be stored in global storage (top-level resource) |
| `store` | Can be stored inside other structs |
| `copy` | Can be copied/duplicated |
| `drop` | Can be discarded without explicit destruction |

### Move 2 noteworthy features
- `#[event]` attribute replaces `EventHandle` — simpler event emission via `event::emit()`
- `enum` types now supported
- Receiver-style function syntax: `value.method()` works

### Error pattern
```move
const E_NOT_FOUND: u64 = 1;
assert!(condition, E_NOT_FOUND);
```

---

## Frontend SDK Patterns (Aptos SDK v2)

### Read a view function
```ts
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));

const [name, description, tasksCompleted] = await aptos.view({
  payload: {
    function: `${CONTRACT_ADDRESS}::agent_registry::get_profile`,
    functionArguments: [ownerAddress],
  },
});
```

### Submit a transaction
```ts
const response = await signAndSubmitTransaction({
  data: {
    function: `${CONTRACT_ADDRESS}::agent_registry::register`,
    functionArguments: ["MyAgent", "An AI agent on Movement"],
  },
});
await aptos.waitForTransaction({ transactionHash: response.hash });
```

### Listen for events (polling approach)
```ts
const events = await aptos.getModuleEventsByEventType({
  eventType: `${CONTRACT_ADDRESS}::agent_registry::AgentRegistered`,
});
```

---

## AI Agent Integration Ideas (Track 1)

### Option A — AI-driven Task Runner
- Frontend has a chat interface (Claude API)
- User describes a task in natural language
- AI agent interprets task, calls contract to record completion
- Shows on-chain proof of task execution

### Option B — Autonomous On-Chain Agent
- Agent registers itself on-chain via `register()`
- Periodically calls `record_task()` when it completes off-chain work
- Frontend shows agent's on-chain activity feed

### Option C — Agent Marketplace
- Multiple agents can register profiles
- Users can browse agents by on-chain stats
- An AI orchestrator picks the best agent for a job

---

## Useful Links
| Resource | URL |
|----------|-----|
| Movement Docs | https://docs.movementnetwork.xyz/devs |
| Network Endpoints | https://docs.movementnetwork.xyz/devs/networkEndpoints |
| First Move Contract | https://docs.movementnetwork.xyz/devs/firstMoveContract |
| Move 2 Syntax | https://docs.movementnetwork.xyz/devs/move2 |
| Move Book | https://docs.movementnetwork.xyz/devs/move-book/modules |
| MoveSpiders (interactive) | https://movespiders.com/ |
| Explorer (testnet) | https://explorer.movementnetwork.xyz/?network=testnet |
| Faucet | https://faucet.movementlabs.xyz |
| Aptos TS SDK | https://aptos.dev/en/build/sdks/ts-sdk |
| AIP-62 Wallet Standard | https://github.com/aptos-foundation/AIPs/blob/main/aips/aip-62.md |

---

## Wallets for Testing
- **Petra** — most popular Aptos/Movement wallet, has testnet support
- **Nightly** — multi-chain wallet, supports Movement
- Download Petra: https://petra.app/

---

## Contract: agent_registry

Current starter module at `contracts/sources/agent_registry.move`:

| Function | Type | Description |
|----------|------|-------------|
| `register(name, description)` | entry | Register an AI agent profile on-chain |
| `record_task()` | entry | Increment task counter for the calling account |
| `get_profile(address)` | view | Returns (name, description, tasks_completed) |
| `is_registered(address)` | view | Returns bool |

Events emitted:
- `AgentRegistered { owner, name }`
- `TaskCompleted { owner, tasks_completed }`
