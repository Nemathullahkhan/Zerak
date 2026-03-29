"use client";

import { NodeSelector } from "@/components/node-selector";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { memo, useState } from "react";

export const AddNodeButton = memo(() => {
  const [selectorOpen, setSelectorOpen] = useState(false);
  return (
    <NodeSelector open={selectorOpen} onOpenChange={setSelectorOpen}>
      <div className="p-0.5 bg-zinc-800 rounded-md">
        <Button size="icon" variant="outline" className="bg-background">
          <PlusIcon className="size-4" />
        </Button>
      </div>
    </NodeSelector>
  );
});

AddNodeButton.displayName = "AddNodeButton";
