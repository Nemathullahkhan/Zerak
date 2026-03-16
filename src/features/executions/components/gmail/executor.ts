import { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { getGoogleToken } from "@/lib/google-token";
import { resolveTemplate } from "@/lib/template";
import { gmailChannel } from "@/app/inngest/channels/gmail";

// ─── Types ────────────────────────────────────────────────────────────────────

type GmailData = {
  variableName?: string;
  to?: string;
  subject?: string;
  body?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a minimal RFC 2822 MIME string and base64url-encodes it.
 * Gmail's REST API only accepts base64url — not standard base64.
 */
function buildRawMime({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}): string {
  const mime = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    `MIME-Version: 1.0`,
    ``,
    body,
  ].join("\r\n");

  return Buffer.from(mime).toString("base64url");
}

// ─── Executor ─────────────────────────────────────────────────────────────────

export const gmailExecutor: NodeExecutor<GmailData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  // 1. Signal loading
  await publish(
    gmailChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  // 2. Validate required fields up front — fail fast, non-retryable
  if (!data.to) {
    await publish(gmailChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Gmail node: Recipient (To) is required.");
  }
  if (!data.subject) {
    await publish(gmailChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Gmail node: Subject is required.");
  }
  if (!data.body) {
    await publish(gmailChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Gmail node: Body is required.");
  }
  if (!data.variableName) {
    await publish(gmailChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Gmail node: Variable name is required.");
  }

  try {
    const result = await step.run("gmail-send", async () => {
      // 3. Get a valid Google access token (auto-refreshes if expired)
      const accessToken = await getGoogleToken({ userId });
      if (!accessToken) {
        throw new NonRetriableError(
          "Gmail node: No Google account linked. Ask the user to connect Google in Settings.",
        );
      }

      // 4. Resolve {{template}} variables against workflow context
      const to = resolveTemplate(data.to!, context);
      const subject = resolveTemplate(data.subject!, context);
      const body = resolveTemplate(data.body!, context);

      // 5. Build the raw MIME message and send it
      const raw = buildRawMime({ to, subject, body });

      const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gmail API error ${response.status}: ${errorBody}`);
      }

      const sent = await response.json();

      // 6. Return updated context with this node's result
      return {
        ...context,
        [data.variableName!]: {
          sent: true,
          messageId: sent.id,
          threadId: sent.threadId,
          to,
          subject,
        },
      };
    });

    await publish(gmailChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(gmailChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
