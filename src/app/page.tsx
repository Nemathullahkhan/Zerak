import { authClient } from "@/lib/auth-client";
import { requireAuth } from "@/lib/auth-utils";
import { Button } from "@base-ui/react";

const Page = async () => {
  const session = await requireAuth();
  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center">
      protected server component
    </div>
  );
};

export default Page;
