"use client";
import React, { CSSProperties, useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

import {
  PROGRAM_ID,
  createCreateInstruction,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ClockLoader, BounceLoader, FadeLoader } from "react-spinners";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import Link from "next/link";

const TokenCreateView = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [file, setFile] = useState<File>();
  const [tokenURI, setTokenURI] = useState<string>("");
  const [tokenMintAddress, setTokenMintAddress] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const override: CSSProperties = {
    display: "block",
    borderColor: "black",
  };

  const [token, setToken] = useState({
    name: "",
    symbol: "",
    decimals: "",
    amount: "",
    image: "",
    description: "",
  });

  const handleFormFieldChange = (fieldName: any, e: any) => {
    setToken({ ...token, [fieldName]: e.target.value });
  };

  // CREATE TOKEN FUNCTION
  const createToken = useCallback(
    async (token: any) => {
      setIsLoading(true);
      const lamports = await getMinimumBalanceForRentExemptMint(connection);
      const mintKeypair = Keypair.generate();
      const tokenATA = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        publicKey as PublicKey
      );

      try {
        const metadataUrl = await uploadMetadata(token);
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
                  name: token.name,
                  symbol: token.symbol,
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
            token.decimals,
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
            Number(token.amount) * Math.pow(10, Number(token.decimals))
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
                href={`https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}/?cluster=devnet`}
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
    },
    [publicKey, connection, sendTransaction]
  );

  // IMAGE UPLOAD TO IPFS
  const handleImageChange = async (event: any) => {
    const file = event.target.files[0];
    if (file) {
      const imageUrl: string = await uploadImagePinata(file);
      setToken({ ...token, image: imageUrl });
    }
  };

  const uploadImagePinata = async (file: any) => {
    if (file) {
      setIsLoading(true);
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
      } finally {
        setIsLoading(false);
      }
    }
  };

  // METADATA UPLOAD TO IPFS
  const uploadMetadata = async (token: any) => {
    const { name, symbol, decimals, amount, image, description } = token;

    if (!name || !symbol || !image || !description) {
      return console.log("Please fill all the fields");
    }

    const metadata = JSON.stringify({
      name,
      symbol,
      decimals,
      image,
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

  return (
    <div className="w-full max-w-[350px]">
      <div className="mb-5 text-xl font-medium">
        <h1>Create New Token</h1>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label>Image</Label>
          <Input type="file" onChange={handleImageChange} />
        </div>
        <div>
          <Label>Name</Label>
          <Input
            type="text"
            placeholder="Name"
            onChange={(e) => setToken({ ...token, name: e.target.value })}
          />
        </div>
        <div>
          <Label>Symbol</Label>
          <Input
            type="text"
            placeholder="Symbol"
            onChange={(e) => setToken({ ...token, symbol: e.target.value })}
          />
        </div>
        <div>
          <Label>Decimals</Label>
          <Input
            type="number"
            placeholder="Decimals"
            onChange={(e) => setToken({ ...token, decimals: e.target.value })}
          />
        </div>
        <div>
          <Label>Amount</Label>
          <Input
            type="number"
            placeholder="Amount"
            onChange={(e) => setToken({ ...token, amount: e.target.value })}
          />
        </div>
        <div>
          <Label>Description</Label>
          <Input
            type="text"
            placeholder="Description"
            onChange={(e) =>
              setToken({ ...token, description: e.target.value })
            }
          />
        </div>
        <div className="w-full">
          <Button
            onClick={() => createToken(token)}
            disabled={isLoading}
            className="w-full space-x-2"
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
        </div>
      </div>
    </div>
  );
};

export default TokenCreateView;
