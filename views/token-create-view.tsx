"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import TokenPreview from "@/components/token-create/token-preview";
import FileUploader from "@/components/token-create/file-uploader";
import TokenForm from "@/components/token-create/token-form";
import TokenCreateButton from "@/components/token-create/token-create-button";
import { useTokenStore } from "@/store/token.store";

const TokenCreateView = () => {
  const tokenMintAddress = useTokenStore((state) => state.tokenMintAddress);
  return (
    <div className="w-full max-w-[400px] mt-[80px] md:mt-10">
      <Card className="bg-gradient-to-r from-indigo-800 to-purple-800 shadow-lg">
        <CardHeader>
          <CardTitle>Create New Token</CardTitle>
          <CardDescription>create your own solana token</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tokenMintAddress ? (
              <>
                <TokenPreview />
                <TokenCreateButton />
              </>
            ) : (
              <div>
                <FileUploader />
                <TokenForm />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenCreateView;
