import React from "react";
interface PageProps {
  params: Promise<{ workflowId: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { workflowId } = await params;
  return <div>Workflow ID: {workflowId}</div>;
};

export default Page;
