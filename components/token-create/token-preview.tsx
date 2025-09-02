"use client";
import Link from "next/link";
import React from "react";
import { Card } from "../ui/card";
import Image from "next/image";
import { TokenType } from "@/types/index.types";
import { useTokenStore } from "@/store/token.store";

const TokenPreview: React.FC = () => {
  const file: any = useTokenStore((state) => state.file);
  const token: TokenType = useTokenStore((state) => state.token);
  const tokenMintAddress: string = useTokenStore(
    (state) => state.tokenMintAddress
  );

  return (
    <Link
      href={`https://explorer.solana.com/address/${tokenMintAddress}?cluster=devnet`}
      target="_blank"
      className="flex"
    >
      <Card className="mx-auto text-center space-y-4 cursor-pointer bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-600 hover:to-purple-600 shadow-2xl shadow-purple-800 p-5 border-0">
        <div className="flex justify-center items-center gap-4">
          <div className=" flex justify-center items-center">
            {token?.image && (
              <Image
                src={token?.image}
                alt={file?.path}
                width={0}
                height={0}
                sizes="100vw"
                className="w-[70px] h-[70px] rounded-full hover:bg-opacity-50"
              />
            )}
          </div>
          <div className="text-[18px] font-medium">
            <div>{token?.name}</div>
            <div className="text-[#c4c4c4]">{token?.symbol}</div>
          </div>
        </div>
        <div className="text-[#fff] text-[12px]">Click View Your Token</div>
      </Card>
    </Link>
  );
};

export default TokenPreview;
