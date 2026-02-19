"use client";

import { ReactNode } from "react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  // Wallet adapter plugins currently reject CUSTOM networks during init.
  // Use Aptos TESTNET for wallet-adapter bootstrapping; app tx queries still
  // use Movement endpoints elsewhere.
  const dappConfig = {
    network: Network.TESTNET,
  };
  
  return (
    <AptosWalletAdapterProvider
      optInWallets={["Nightly"]}
      autoConnect={true}
      dappConfig={dappConfig}
      onError={(error) => {
        console.error("Wallet error:", JSON.stringify(error, null, 2));
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
