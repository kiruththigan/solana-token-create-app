"use client";
import React from "react";
import { SolanaWalletConnectionButton } from "../wallet/solana-wallet-connection-button";

const Navbar = () => {
  return (
    <div className="w-full flex justify-end items-center px-5 py-5 absolute top-0 right-0 left-0">
        <SolanaWalletConnectionButton />
    </div>
  );
};

export default Navbar;
