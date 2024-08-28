import TokenCreateView from "@/views/token-create-view";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-5 md:p-24">
      <TokenCreateView />
    </main>
  );
}
