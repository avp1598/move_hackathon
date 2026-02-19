# Movement Network Connect Wallet Template

A production-ready Next.js template for building decentralized applications (dApps) on Movement Network with comprehensive wallet integration, network switching, message signing, and transaction capabilities.

## ✨ Features

- **🔌 Wallet Connectivity**: Support for AIP-62 compatible wallets
- **🌐 Network Management**: Seamless switching between Movement Network mainnet and testnet
- **✍️ Message Signing**: "Hello World" message signing with signature display
- **💸 Token Transfers**: Native MOVE token transfer functionality (1 MOVE default)
- **🎨 Modern UI**: Built with shadcn/ui components and Tailwind CSS
- **📱 Responsive Design**: Mobile-first approach with beautiful microinteractions
- **🌙 Theme Support**: Light/dark mode with system preference detection
- **⚡ TypeScript**: Full type safety with Aptos SDK integration

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- AIP-62 compatible wallet (Petra, Nightly, Martian, etc.)

### Installation

1. **Fork or clone this repository**
   ```bash
   git clone https://github.com/yourusername/movement-connectwallet-template.git
   cd movement-connectwallet-template
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
movement-connectwallet-template/
├── app/                          # Next.js App Router
│   ├── globals.css              # Global styles and Tailwind CSS
│   ├── layout.tsx               # Root layout with providers
│   └── page.tsx                 # Main page component
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   ├── header.tsx               # Application header
│   ├── wallet-provider.tsx      # Aptos wallet adapter provider
│   ├── wallet-selection-modal.tsx # Custom wallet selection modal
│   ├── wallet-demo-content.tsx  # Main wallet interaction interface
│   ├── switch-network.tsx       # Network switching component
│   ├── sign-message.tsx         # Message signing functionality
│   ├── send-transaction.tsx     # Token transfer component
│   └── theme-toggle.tsx         # Theme switching component
├── lib/                         # Utility functions
├── types/                       # TypeScript type definitions
├── hooks/                       # Custom React hooks
└── public/                      # Static assets
```

## 🔧 Configuration

### Movement Network Configuration

The template is pre-configured for Movement Network with the following settings:

- **Mainnet**: Chain ID 126, RPC: `https://full.mainnet.movementinfra.xyz/v1`
- **Testnet**: Chain ID 250, RPC: `https://full.testnet.movementinfra.xyz/v1`

Configuration is handled in `components/wallet-provider.tsx`:

```typescript
const aptosConfig = new AptosConfig({
  network: Network.MAINNET,
  fullnode: "https://full.mainnet.movementinfra.xyz/v1",
});
```

### Environment Variables

Create a `.env.local` file in the root directory for custom configurations:

```env
# Optional: Custom RPC endpoints
NEXT_PUBLIC_MAINNET_RPC=https://full.mainnet.movementinfra.xyz/v1
NEXT_PUBLIC_TESTNET_RPC=https://full.testnet.movementinfra.xyz/v1

# Optional: Custom chain IDs
NEXT_PUBLIC_MAINNET_CHAIN_ID=126
NEXT_PUBLIC_TESTNET_CHAIN_ID=250
```

## 💼 Wallet Integration

### Supported Wallets

This template supports all AIP-62 compatible wallets:

- **Petra** - Official Aptos wallet
- **Nightly** - Multi-chain wallet with Movement Network support
- **Martian** - Aptos ecosystem wallet
- **Pontem** - Aptos DeFi wallet
- **Any other AIP-62 compatible wallet**

### Wallet Connection Flow

1. **Click "Connect Wallet"** on the homepage
2. **Select your wallet** from the custom modal
3. **Approve connection** in your wallet
4. **Start interacting** with Movement Network features

### Custom Wallet Modal

The template includes a custom wallet selection modal built with shadcn/ui components, giving you full control over the design and user experience without being tied to specific UI frameworks.

## 🌐 Network Management

### Switching Networks

- **Mainnet**: Production environment with real MOVE tokens
- **Testnet**: Development environment with test MOVE tokens

The network switcher automatically:
- Updates the application state
- Synchronizes with your connected wallet
- Provides visual feedback for the current network
- Handles network-specific configurations

### Network Detection

The template automatically detects and displays:
- Current network name
- Chain ID
- Connection status
- Network-specific features

## 🔐 Message Signing

### Sign "Hello World" Message

1. **Connect your wallet** to the application
2. **Navigate to the Sign Message section**
3. **Click "Sign Message"**
4. **Approve the signature request** in your wallet
5. **View the signed message and signature**

This feature is perfect for:
- Verifying wallet connectivity
- Testing signature capabilities
- Building authentication flows
- Educational purposes

## 💸 Token Transfers

### Send MOVE Tokens

1. **Ensure you have MOVE tokens** in your wallet
2. **Enter the recipient address** (valid Movement Network address)
3. **Confirm the 1 MOVE amount** (pre-filled for convenience)
4. **Approve the transaction** in your wallet
5. **Monitor transaction status** with real-time updates

### Transaction Features

- **Pre-filled amount**: 1 MOVE token (easily customizable)
- **Address validation**: Ensures valid Movement Network addresses
- **Transaction confirmation**: Clear confirmation before submission
- **Status tracking**: Real-time updates on transaction progress
- **Success feedback**: Toast notifications and transaction details

## 🎨 UI Components

### Built with shadcn/ui

The template uses shadcn/ui components for a consistent, accessible, and beautiful user interface:

- **Button**: Multiple variants and sizes
- **Card**: Clean content containers
- **Dialog**: Modal components
- **Dropdown**: Network selection
- **Toast**: Notification system
- **Theme toggle**: Light/dark mode switching

### Customization

All components are fully customizable:
- Modify colors and themes in `app/globals.css`
- Customize component variants in individual component files
- Add new components following the existing patterns
- Override default styles with Tailwind CSS classes

## 🚀 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

### Adding New Features

1. **Create new components** in the `components/` directory
2. **Add new pages** in the `app/` directory
3. **Extend wallet functionality** in `components/wallet-provider.tsx`
4. **Add new UI components** using shadcn/ui patterns


## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Movement Network](https://movementnetwork.xyz/) for building an amazing blockchain
- [Aptos Labs](https://aptoslabs.com/) for the excellent SDK and wallet adapter
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Next.js](https://nextjs.org/) for the powerful React framework

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/movement-connectwallet-template/issues)
- **Documentation**: Check the [Movement Network docs](https://docs.movementnetwork.xyz/)


