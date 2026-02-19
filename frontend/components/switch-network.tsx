"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { toast } from "sonner";

type NightlyWindow = Window & {
  nightly?: {
    aptos?: {
      changeNetwork?: (network: { chainId: number; name: "custom" }) => Promise<void>;
    };
  };
};

export function SwitchNetwork() {
  const { network, wallet } = useWallet();
  
  // Determine current network type - use chain IDs as primary detection
  const isMovementMainnet = network?.chainId === 126;
  const isMovementTestnet = network?.chainId === 250;
  const isMovementNetwork = isMovementMainnet || isMovementTestnet;
  const isNightly = wallet?.name?.toLowerCase().includes("nightly");

  
  
  const handleSwitchNetwork = async (targetNetwork: "mainnet" | "testnet") => {
    const networkName = targetNetwork === "mainnet" ? "Movement Mainnet" : "Movement Testnet";
    const loadingToast = toast.loading(`Switching to ${networkName}...`);

    try {
      // Movement Network chain IDs
      const chainId = targetNetwork === "mainnet" ? 126 : 250;
      
      // Check if we're using Nightly wallet
      if (isNightly && typeof window !== "undefined") {
        // Use Nightly's direct API
        const nightly = (window as NightlyWindow).nightly;

        if (nightly?.aptos?.changeNetwork) {
          await nightly.aptos.changeNetwork({
            chainId,
            name: "custom"
          });
          
          // Give some time for the network state to update
          setTimeout(() => {
            toast.success(`Switched to ${networkName}`, {
              id: loadingToast,
            });
          }, 1000);
          return;
        }
      }
      
      // No fallback - only Nightly supports Movement network switching
      toast.error("Network switching not supported. Please use Nightly wallet for network switching.", {
        id: loadingToast,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : `Failed to switch to ${networkName}`;
      toast.error(errorMessage, {
        id: loadingToast,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Switch Network</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          <p className="text-muted-foreground">Current Network:</p>
          <p className="font-medium">
            {isMovementMainnet && "Movement Mainnet (Chain ID: 126)"}
            {isMovementTestnet && "Movement Testnet (Chain ID: 250)"}
            {!isMovementNetwork && `${network?.name || "Unknown"} (Chain ID: ${network?.chainId})`}
          </p>
          {!isMovementNetwork && (
            <p className="text-xs text-orange-500 mt-1">
              Switch to Movement network to use Movement dApps
            </p>
          )}
        </div>
        
        {isNightly ? (
          <div className="flex flex-col gap-2">
            {/* If not on Movement network, show both buttons */}
            {!isMovementNetwork ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSwitchNetwork("mainnet")}
                  className="w-full"
                >
                  Switch to Movement Mainnet
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSwitchNetwork("testnet")}
                  className="w-full"
                >
                  Switch to Movement Testnet
                </Button>
              </>
            ) : (
              <>
                {/* Show Mainnet button if on Movement testnet */}
                {isMovementTestnet && (
                  <Button
                    variant="outline"
                    onClick={() => handleSwitchNetwork("mainnet")}
                    className="w-full"
                  >
                    Switch to Movement Mainnet
                  </Button>
                )}
                
                {/* Show Testnet button if on Movement mainnet */}
                {isMovementMainnet && (
                  <Button
                    variant="outline"
                    onClick={() => handleSwitchNetwork("testnet")}
                    className="w-full"
                  >
                    Switch to Movement Testnet
                  </Button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="text-center space-y-2 py-4">
            <p className="text-sm text-muted-foreground">
              Please manually switch to a Movement network in your wallet:
            </p>
            <div className="text-xs space-y-1">
              <p><strong>Movement Mainnet:</strong> Chain ID 126</p>
              <p><strong>Movement Testnet:</strong> Chain ID 250</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Automatic network switching is only available with Nightly wallet
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
