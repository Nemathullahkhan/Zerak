import { requireAuth } from "@/lib/auth-utils";
import React from "react";

const Page = async () => {
  await requireAuth();
  return <p>Workflow page</p>;
};

export default Page;
