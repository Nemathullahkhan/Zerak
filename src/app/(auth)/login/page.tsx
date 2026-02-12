import { LoginForm } from "@/features/auth/components/login-form";
import React from "react";

const Page = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-sans w-full">
      <LoginForm />
    </div>
  );
};

export default Page;
