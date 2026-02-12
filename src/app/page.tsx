import { useTRPC } from "@/trpc/client";
import { getQueryClient, trpc } from "@/trpc/server";
// import { prisma } from "@/lib/db";
// import { caller } from "@/trpc/server";
import { dehydrate, HydrationBoundary, useQuery } from "@tanstack/react-query";
import React, { Suspense } from "react";
import Client from "./client";

const Page = () => {
  // const users = await caller.getUsers(); -- fetch data from trpc server
  // fetch data from trpc in a client component
  // const trpc = useTRPC();
  // const { data: users } = useQuery(trpc.getUsers.queryOptions());

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.getUsers.queryOptions());

  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<p>Loading....</p>}>
          <Client />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
};

export default Page;
