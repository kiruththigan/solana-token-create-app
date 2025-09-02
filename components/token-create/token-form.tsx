"use client";
import React, { CSSProperties, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTokenStore } from "@/store/token.store";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { symbol, z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import TokenCreateButton from "./token-create-button";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import {
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";
import {
  PROGRAM_ID,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import Link from "next/link";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { BounceLoader } from "react-spinners";
import { TokenType } from "@/types/index.types";

const override: CSSProperties = {
  display: "block",
  borderColor: "black",
};

const TokenForm: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const {
    file,
    setFile,
    setIsFileError,
    token,
    setTokenName,
    setTokenSymbol,
    setTokenDecimals,
    setTokenAmount,
    setTokenImage,
    setTokenDescription,
    tokenMintAddress,
    setTokenMintAddress,
    isLoading,
    setIsLoading,
  } = useTokenStore();

  const formSchema = z.object({
    name: z.string().min(1, {
      message: "Please enter the token name.",
    }),
    symbol: z.string().min(1, { message: "Please enter the token symbol." }),
    decimals: z
      .string()
      .min(1, { message: "Please enter the token decimals." }),
    amount: z.string().min(1, { message: "Please enter the token amount." }),
    image: z.string().nullable().optional(),
    description: z
      .string()
      .min(1, { message: "Please enter the token description." }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      symbol: "",
      decimals: "",
      amount: "",
      description: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!file) {
      return;
    }
    console.log(values);
    await createToken(values);
  }

  // CREATE TOKEN FUNCTION
  const createToken = async (values: any) => {
    const { name, symbol, decimals, amount, image, description }: TokenType =
      values;

    setIsLoading(true);
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    const mintKeypair = Keypair.generate();
    const tokenATA = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      publicKey as PublicKey
    );

    try {
      const metadataUrl = await uploadMetadata(values);
      if (metadataUrl === "false") {
        return;
      }
      console.log(metadataUrl);

      const createMetadataInstruction =
        createCreateMetadataAccountV3Instruction(
          {
            metadata: PublicKey.findProgramAddressSync(
              [
                Buffer.from("metadata"),
                PROGRAM_ID.toBuffer(),
                mintKeypair.publicKey.toBuffer(),
              ],
              PROGRAM_ID
            )[0],
            mint: mintKeypair.publicKey,
            mintAuthority: publicKey as PublicKey,
            payer: publicKey as PublicKey,
            updateAuthority: publicKey as PublicKey,
          },
          {
            createMetadataAccountArgsV3: {
              data: {
                name: name,
                symbol: symbol,
                uri: metadataUrl,
                sellerFeeBasisPoints: 0,
                creators: null,
                collection: null,
                uses: null,
              },
              isMutable: false,
              collectionDetails: null,
            },
          }
        );

      const createnewTokenTransaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: publicKey as PublicKey,
          newAccountPubkey: mintKeypair.publicKey as PublicKey,
          lamports,
          space: MINT_SIZE,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          parseInt(decimals),
          publicKey as PublicKey,
          publicKey as PublicKey,
          TOKEN_PROGRAM_ID
        ),
        createAssociatedTokenAccountInstruction(
          publicKey as PublicKey,
          tokenATA,
          publicKey as PublicKey,
          mintKeypair.publicKey
        ),
        createMintToInstruction(
          mintKeypair.publicKey,
          tokenATA,
          publicKey as PublicKey,
          parseFloat(amount) * Math.pow(10, parseInt(decimals))
        ),
        createMetadataInstruction
      );

      const transactionSignature = await sendTransaction(
        createnewTokenTransaction,
        connection,
        { signers: [mintKeypair] }
      );

      console.log("Transaction signature", transactionSignature);
      setTokenMintAddress(mintKeypair.publicKey.toString());
      toast({
        title: "Success",
        description: "Successfully added liquidity pool",
        action: (
          <ToastAction altText="Try again" className="p-0">
            <Link
              href={`https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=devnet`}
              target="_blank"
              className="p-2"
            >
              View Token
            </Link>
          </ToastAction>
        ),
      });
    } catch (error: any) {
      console.log("Error while create Token , ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Something wrong while create Token`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // METADATA UPLOAD TO IPFS
  const uploadMetadata = async (values: any) => {
    const { name, symbol, decimals, amount, image, description }: TokenType =
      values;

    if (
      !file ||
      !name ||
      !symbol ||
      !amount ||
      !description ||
      !(parseFloat(amount) > 0.0)
    ) {
      toast({
        title: "Oh Something wrong!",
        description: `Please fill all the fields!`,
      });
      console.log("Please fill all the fields");
      return "false";
    }

    const imageUrl: string = await uploadImagePinata(file);
    setTokenImage(imageUrl);

    const metadata = JSON.stringify({
      name,
      symbol,
      decimals,
      image: imageUrl,
      description,
    });

    try {
      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        metadata,
        {
          headers: {
            "Content-Type": `application/json`,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
          },
        }
      );

      if (response && response.status == 200) {
        const metadataUrl =
          process.env.NEXT_PUBLIC_PINATA_BASE_URL + response.data.IpfsHash;

        console.log("metadataUrl ", metadataUrl);

        return metadataUrl;
      }
    } catch (error: any) {
      console.log("Error while upload metadata to pinata ", error);
    }
  };

  const uploadImagePinata = async (file: any) => {
    if (file) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const pinataMetadata = JSON.stringify({
          name: file.name,
        });
        formData.append("pinataMetadata", pinataMetadata);

        const pinataOptions = JSON.stringify({
          cidVersion: 0,
        });
        formData.append("pinataOptions", pinataOptions);
        const response = await axios.post(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          formData,
          {
            headers: {
              "Content-Type": `multipart/form-data`,
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
            },
          }
        );

        if (response && response.status == 200) {
          const imageUrl =
            process.env.NEXT_PUBLIC_PINATA_BASE_URL + response.data.IpfsHash;

          console.log("imageUrl ", imageUrl);

          return imageUrl;
        }
      } catch (error: any) {
        console.log("Error while upload image to pinata ", error);
      }
    }
  };
  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-1">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-[12px] font-normal ">Name</FormLabel>
                <FormControl>
                  <Input placeholder="Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="symbol"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-[12px] font-normal ">
                  Symbol
                </FormLabel>
                <FormControl>
                  <Input placeholder="Symbol" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="decimals"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-[12px] font-normal ">
                  Decimals
                </FormLabel>
                <FormControl>
                  <Input placeholder="Decimals" type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-[12px] font-normal ">
                  Amount
                </FormLabel>
                <FormControl>
                  <Input placeholder="Amount" type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-[12px] font-normal ">
                  Description
                </FormLabel>
                <FormControl>
                  <Input placeholder="Description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="pt-2">
            {!publicKey ? (
              <Button
                size={"lg"}
                disabled={true}
                className="w-full space-x-2 bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg"
              >
                <div>Please connect your wallet</div>
              </Button>
            ) : (
              <Button
                size={"lg"}
                type="submit"
                onClick={() => {
                  if (!file) {
                    setIsFileError(true);
                  }
                }}
                disabled={isLoading}
                className="w-full space-x-2 bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg"
              >
                {isLoading && (
                  <BounceLoader
                    color={"#000"}
                    loading={isLoading}
                    cssOverride={override}
                    size={20}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                  />
                )}
                <div>Create Token</div>
              </Button>
            )}
          </div>
        </form>
      </Form>

      {/* <div>
        <Label>Name</Label>
        <Input
          type="text"
          placeholder="Name"
          onChange={(e) => setTokenName(e.target.value)}
        />
      </div>
      <div>
        <Label>Symbol</Label>
        <Input
          type="text"
          placeholder="Symbol"
          onChange={(e) => setTokenSymbol(e.target.value)}
        />
      </div>
      <div>
        <Label>Decimals</Label>
        <Input
          type="number"
          placeholder="Decimals"
          onChange={(e) => setTokenDecimals(e.target.value)}
        />
      </div>
      <div>
        <Label>Amount</Label>
        <Input
          type="number"
          placeholder="Amount"
          onChange={(e) => setTokenAmount(e.target.value)}
          min={0}
        />
      </div>
      <div>
        <Label>Description</Label>
        <Input
          type="text"
          placeholder="Description"
          onChange={(e) => setTokenDescription(e.target.value)}
        />
      </div> */}
    </div>
  );
};

export default TokenForm;
