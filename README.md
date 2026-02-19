# Move Hackathon — Open Claw @ ETH Denver

Track 1: **Build with an AI Agent** on Movement Network.

## Project Structure

```
move_hackathon/
├── contracts/               # Move smart contracts
│   ├── Move.toml
│   └── sources/
│       └── agent_registry.move
├── frontend/                # Next.js + Aptos SDK dApp
│   ├── app/
│   ├── components/
│   └── .env.local
└── RESEARCH.md              # Notes, commands, SDK patterns
```

## Quick Start

### 1. Get testnet MOVE tokens
Visit https://faucet.movementlabs.xyz and enter your wallet address.

### 2. Deploy the contract
```bash
cd contracts
movement move publish --named-addresses move_hackathon=0x19e8061f2064bfdbfecd2994c013735ec9f6575328047af0dc6cfc2855efbcf6
```

### 3. Run the frontend
```bash
cd frontend
bun run dev
```

## Account
- **Address**: `0x19e8061f2064bfdbfecd2994c013735ec9f6575328047af0dc6cfc2855efbcf6`
- **Network**: Testnet (Chain ID 250)
- **Explorer**: https://explorer.movementnetwork.xyz/account/0x19e8061f2064bfdbfecd2994c013735ec9f6575328047af0dc6cfc2855efbcf6?network=testnet

See `RESEARCH.md` for full reference notes, SDK patterns, and idea sketches.
