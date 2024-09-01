"use client";
import React, { CSSProperties, useCallback, useEffect, useState } from "react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { CloudUpload, Edit, Trash2 } from "lucide-react";

const TokenCreateView = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [isHovered, setIsHovered] = useState(false);

  const { getRootProps, getInputProps, open, acceptedFiles } = useDropzone({
    noClick: true,
    noKeyboard: true,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
    },
  });

  useEffect(() => {
    if (acceptedFiles?.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, [acceptedFiles]);

  const [file, setFile] = useState<any>();
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
    },
    [publicKey, connection, sendTransaction, file, setFile]
  );

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

  // METADATA UPLOAD TO IPFS
  const uploadMetadata = async (token: any) => {
    const { name, symbol, decimals, amount, description } = token;

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
    setToken({ ...token, image: imageUrl });

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
              <Link
                href={`https://explorer.solana.com/address/${tokenMintAddress}?cluster=devnet`}
                target="_blank"
              >
                <Card className="w-full max-w-[220px] mx-auto text-center space-y-4 cursor-pointer bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-600 hover:to-purple-600 shadow-2xl shadow-purple-800 p-5 border-0">
                  <div className="flex justify-center items-center gap-4">
                    <div className=" flex justify-center items-center">
                      {token.image && (
                        <Image
                          src={token.image}
                          alt={file?.path}
                          width={0}
                          height={0}
                          sizes="100vw"
                          className="w-[70px] h-[70px] rounded-full hover:bg-opacity-50"
                        />
                      )}
                    </div>
                    <div className="text-[18px] font-medium">
                      <div>{token.name}</div>
                      <div className="text-[#c4c4c4]">{token.symbol}</div>
                    </div>
                  </div>
                  <div className="text-[#fff] text-[12px]">
                    Click View Your Token
                  </div>
                </Card>
              </Link>
            ) : (
              <div>
                <div>
                  {/* <Label>Image</Label>
              <Input type="file" onChange={handleImageChange} /> */}
                  <div {...getRootProps({ className: "dropzone" })}>
                    <input {...getInputProps()} />
                    {file ? (
                      <div
                        className="relative w-[150px] h-[150px] mx-auto"
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                      >
                        <Image
                          src={URL.createObjectURL(file)}
                          alt={file?.path}
                          width={0}
                          height={0}
                          sizes="100vw"
                          className="w-[150px] h-[150px] rounded-lg hover:bg-opacity-50"
                        />
                        {isHovered && (
                          <div className="absolute top-0 right-0 bottom-0 left-0 flex justify-center items-center gap-10 bg-[#00000088] rounded-lg">
                            <Edit
                              onClick={open}
                              className="size-8 cursor-pointer hover:scale-110 "
                            />
                            <Trash2
                              onClick={() => setFile("")}
                              className="size-8 cursor-pointer hover:scale-110 "
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer rounded-lg w-[100px] h-[100px] flex flex-col justify-center items-center space-y-1 p-4 mx-auto border border-dashed border-[#000000] dark:border-[#000000]"
                        onClick={open}
                      >
                        <div>
                          <CloudUpload className="size-8" />
                        </div>
                        <div className="text-[10px] text-center">
                          Click or drag image.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Name</Label>
                  <Input
                    type="text"
                    placeholder="Name"
                    onChange={(e) =>
                      setToken({ ...token, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Symbol</Label>
                  <Input
                    type="text"
                    placeholder="Symbol"
                    onChange={(e) =>
                      setToken({ ...token, symbol: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Decimals</Label>
                  <Input
                    type="number"
                    placeholder="Decimals"
                    onChange={(e) =>
                      setToken({ ...token, decimals: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="Amount"
                    onChange={(e) =>
                      setToken({ ...token, amount: e.target.value })
                    }
                    min={0}
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
              </div>
            )}

            <div className="w-full">
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
                  onClick={() => {
                    if (tokenMintAddress) {
                      setTokenMintAddress("");
                      setFile("");
                    } else {
                      createToken(token);
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenCreateView;
