"use client";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import React from "react";

export const SolanaWalletConnectionButton = () => {
  const [isMount, setIsMount] = React.useState<boolean>(false);

  React.useEffect(() => {
    setIsMount(true);
  }, []);

  if (!isMount) {
    return;
  }
  return (
    <div>
      <WalletMultiButton />
    </div>
  );
};
