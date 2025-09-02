"use client";
import React from "react";
import { Button } from "../ui/button";
import { useTokenStore } from "@/store/token.store";

const TokenCreateButton = () => {
  const { setFile, setTokenMintAddress } = useTokenStore();

  return (
    <div className="w-full">
      <Button
        size={"lg"}
        type="submit"
        onClick={() => {
          setTokenMintAddress("");
          setFile(null);
        }}
        className="w-full space-x-2 bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg"
      >
        <div>Create Token</div>
      </Button>
    </div>
  );
};

export default TokenCreateButton;
