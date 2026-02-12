import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] font-sans w-full flex flex-col items-center justify-center">
      <div className="w-full max-w-md pb-12">
        <div className="flex flex-col items-center ">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <Image
              src="/logos/ZerakLogo2.svg"
              alt="Zerak Logo"
              width={48}
              height={48}
              className="h-72 w-72"
              priority
            />
          </Link>
        </div>
        <div className="flex w-full justify-center items-center mb-6 -mt-24 z-10">
            <h1 className="text-2xl font-semibold text-neutral-100">Zerak</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

