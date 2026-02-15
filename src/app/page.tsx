"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import LandingPage from "./(landing_page)/page";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout";
import { toast } from "sonner";

const Page = () => {
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

  const testAi = useMutation(
    trpc.testAi.mutationOptions({
      onSuccess: () => {
        toast.success("AI job executed successfully!");
      },
      onError: (error) => {
        toast.error(`AI job failed: ${error.message}`);
      },
    }),
  );

  return (
    <>
      <div className="min-h-screen min-w-screen flex items-center justify-center flex-col gap-y-6">
        protected server component
        <div className="">{JSON.stringify(data, null, 2)}</div>
        <Button onClick={() => testAi.mutate()} disabled={testAi.isPending}>
          Test AI
        </Button>
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
