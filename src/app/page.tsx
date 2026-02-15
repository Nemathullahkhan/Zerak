"use client";

import { caller, getQueryClient, trpc } from "@/trpc/server";
// import { prisma } from "@/lib/db";
// import { caller } from "@/trpc/server";
import {
  dehydrate,
  HydrationBoundary,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import React, { Suspense } from "react";
import LandingPage from "./(landing_page)/page";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout";
import { requireAuth } from "@/lib/auth-utils";

const Page = () => {
  // await requireAuth();
  // const data = await caller.getUsers(); // -- fetch data from trpc server component
  // fetch data from trpc in a client component
  // const trpc = useTRPC();
  // const { data: users } = useQuery(trpc.getUsers.queryOptions());

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data } = useQuery(trpc.getWorkflows.queryOptions());

  const create = useMutation(
    trpc.createWorkflow.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.getWorkflows.queryOptions());
      },
    }),
  );

  return (
    <>
      <div className="min-h-screen min-w-screen flex items-center justify-center flex-col gap-y-6">
        protected server component
        <div className="">{JSON.stringify(data, null, 2)}</div>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          Create Workflow
        </Button>
        <LogoutButton />
      </div>

      {/*     
     For now we will just render the landing page, we can add the trpc client component later when we have some data to show
      <LandingPage /> */}
    </>
  );
};

export default Page;
