"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { toast } from "sonner";

export function SignMessage() {
  const { signMessage, account } = useWallet();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [signedMessage, setSignedMessage] = useState<string | null>(null);

  const handleSignMessage = async () => {
    if (!account) {
      toast.error("No account connected");
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!signMessage) {
      toast.error("Wallet does not support message signing");
      return;
    }

    setIsLoading(true);
    setSignedMessage(null);

    const message = `gmove ${name.trim()}`;
    const loadingToast = toast.loading(`Signing message: "${message}"`);

    try {
      toast.loading("Waiting for wallet approval...", {
        id: loadingToast,
      });

      const response = await signMessage({
        message,
        nonce: Date.now().toString(),
      });

      // Handle different wallet response formats.
      let signature: string;

      if (typeof response === "string") {
        signature = response;
      } else {
        const signatureValue = (response as { signature?: unknown }).signature;
        if (typeof signatureValue === "string") {
          signature = signatureValue;
        } else if (signatureValue) {
          signature = JSON.stringify(signatureValue);
        } else {
          signature = JSON.stringify(response);
        }
      }
      
      setSignedMessage(signature);

      toast.success(
        <div className="flex flex-col gap-2">
          <p>Message signed successfully!</p>
          <p className="text-xs opacity-75">Message: &quot;{message}&quot;</p>
        </div>,
        {
          id: loadingToast,
          duration: 5000,
        }
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign message";
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
        <CardTitle>Sign Message</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">Sign a &quot;gmove&quot; message with your wallet.</p>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Name</label>
          <Input
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {signedMessage && (
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-xs font-medium mb-1">Signature:</p>
            <p className="font-mono text-xs break-all opacity-75">
              {signedMessage}
            </p>
          </div>
        )}

        <Button 
          onClick={handleSignMessage}
          disabled={isLoading || !account || !signMessage}
          className="w-full"
        >
          {isLoading ? "Signing..." : "Sign Message"}
        </Button>
      </CardContent>
    </Card>
  );
}
