import { TokenType } from "@/types/index.types";
import { create } from "zustand";

interface TokenStrore {
  file: File | null;
  setFile: (file: File | null) => void;
  tokenMintAddress: string;
  setTokenMintAddress: (addres: string) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  token: TokenType;
  setTokenName: (name: string) => void;
  setTokenSymbol: (symbol: string) => void;
  setTokenDecimals: (decimals: string) => void;
  setTokenAmount: (amount: string) => void;
  setTokenImage: (image: string) => void;
  setTokenDescription: (description: string) => void;
  isFileError: boolean;
  setIsFileError: (isError: boolean) => void;
}

export const useTokenStore = create<TokenStrore>((set) => ({
  file: null,
  setFile: (file) => set({ file: file }),
  tokenMintAddress: "",
  setTokenMintAddress: (address) => set({ tokenMintAddress: address }),
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading: isLoading }),
  token: {
    name: "",
    symbol: "",
    decimals: "",
    amount: "",
    image: "",
    description: "",
  },
  setTokenName: (name) => set((state) => ({ token: { ...state.token, name } })),
  setTokenSymbol: (symbol) =>
    set((state) => ({ token: { ...state.token, symbol } })),
  setTokenDecimals: (decimals) =>
    set((state) => ({ token: { ...state.token, decimals } })),
  setTokenAmount: (amount) =>
    set((state) => ({ token: { ...state.token, amount } })),
  setTokenImage: (image) =>
    set((state) => ({ token: { ...state.token, image } })),
  setTokenDescription: (description) =>
    set((state) => ({ token: { ...state.token, description } })),
  isFileError: false,
  setIsFileError: (isError) => set({ isFileError: isError }),
}));
