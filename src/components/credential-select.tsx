"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import type { CredentialType } from "@/generated/prisma/enums";

interface CredentialSelectProps {
  type: CredentialType;
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export const CredentialSelect = ({
  type,
  value,
  onValueChange,
  disabled,
}: CredentialSelectProps) => {
  const { data: credentials = [], isLoading } = useCredentialsByType(type);

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select API key…" />
      </SelectTrigger>
      <SelectContent>
        {credentials.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
