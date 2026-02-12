import SignupForm from "@/features/auth/components/signup-form";
import { requireUnauth } from "@/lib/auth-utils";
import React from "react";

const Page = async () => {
  await requireUnauth();
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-sans">
      <SignupForm />
    </div>
  );
};

export default Page;
