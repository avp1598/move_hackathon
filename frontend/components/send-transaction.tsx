"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { toast } from "sonner";

export function SendTransaction() {
  const { account, signAndSubmitTransaction, network } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Movement network configurations
  const MOVEMENT_CONFIGS = {
    mainnet: {
      chainId: 126,
      name: "Movement Mainnet",
      fullnode: "https://mainnet.movementnetwork.xyz/v1",
      explorer: "mainnet"
    },
    testnet: {
      chainId: 250,
      name: "Movement Testnet",
      fullnode: "https://testnet.movementnetwork.xyz/v1",
      explorer: "testnet"
    }
  };

  // Get the current network config based on chain ID
  const getCurrentNetworkConfig = () => {
    if (network?.chainId === 126) {
      return MOVEMENT_CONFIGS.mainnet;
    } else if (network?.chainId === 250) {
      return MOVEMENT_CONFIGS.testnet;
    }
    // Default to testnet if unknown
    return MOVEMENT_CONFIGS.testnet;
  };

  // Create Aptos client with the current network
  const getAptosClient = () => {
    const networkConfig = getCurrentNetworkConfig();
    
    const config = new AptosConfig({ 
      network: Network.CUSTOM,
      fullnode: networkConfig.fullnode
    });
    return new Aptos(config);
  };

  const getExplorerUrl = (txHash: string) => {
    const networkConfig = getCurrentNetworkConfig();
    return `https://explorer.movementnetwork.xyz/txn/${txHash}?network=${networkConfig.explorer}`;
  };

  const handleSendTransaction = async () => {
    if (!account) {
      toast.error("No account connected");
      return;
    }

    if (!recipient) {
      toast.error("Please enter a recipient address");
      return;
    }

    setIsLoading(true);

    // Show initial toast
    const loadingToast = toast.loading("Preparing transaction...");

    try {
      // Always send 1 MOVE (1 MOVE = 10^8 octas)
      const amountInOctas = 100000000;

      toast.loading("Waiting for wallet approval...", {
        id: loadingToast,
      });

      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: "0x1::aptos_account::transfer",
          functionArguments: [recipient, amountInOctas],
        },
      });

      toast.loading("Transaction submitted. Waiting for confirmation...", {
        id: loadingToast,
      });

      // Wait for transaction confirmation
      const aptos = getAptosClient();
      if (aptos) {
        try {
          await aptos.waitForTransaction({ transactionHash: response.hash });
          
          // Success toast with link to explorer
          toast.success(
            <div className="flex flex-col gap-2">
              <p>Transaction confirmed!</p>
              <a
                href={getExplorerUrl(response.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline hover:no-underline"
              >
                View on Explorer →
              </a>
            </div>,
            {
              id: loadingToast,
              duration: 10000,
            }
          );
        } catch {
          toast.warning("Transaction submitted but confirmation timed out", {
            id: loadingToast,
            description: "Check the explorer for status",
            action: {
              label: "View",
              onClick: () => window.open(getExplorerUrl(response.hash), "_blank"),
            },
          });
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send transaction";
      toast.error(errorMessage, {
        id: loadingToast,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Transaction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Send 1 MOVE token to another address.
        </p>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Recipient Address</label>
          <Input
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <Button 
          onClick={handleSendTransaction}
          disabled={isLoading || !account}
          className="w-full"
        >
          {isLoading ? "Sending..." : "Send 1 MOVE"}
        </Button>
      </CardContent>
    </Card>
  );
}
