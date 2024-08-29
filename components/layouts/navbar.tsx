"use client";
import React from "react";
import { SolanaWalletConnectionButton } from "../wallet/solana-wallet-connection-button";
import Image from "next/image";

const Navbar = () => {
  return (
    <div className="container w-full flex justify-between items-center py-5 absolute top-0 right-0 left-0">
      <div className="flex justify-center items-center gap-4">
        <Image
          src={"/images/solana-logo.png"}
          alt="logo"
          width={0}
          height={0}
          sizes="100vw"
          className="w-8 h-8"
        />
        <div className="text-xl font-extrabold font-serif">Solana</div>
      </div>
      <SolanaWalletConnectionButton />
    </div>
  );
};

export default Navbar;
