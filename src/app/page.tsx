import { prisma } from "@/lib/db";
import React from "react";

const page = () => {
  return <div className="text-red-500">{JSON.stringify(users)}</div>;
};

export default page;
