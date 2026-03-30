import { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { getGoogleToken } from "@/lib/google-token";
import { resolveTemplate } from "@/lib/template";
import { googleDriveChannel } from "@/app/inngest/channels/google-drive";

// ─── Types ────────────────────────────────────────────────────────────────────

type GoogleDriveData = {
  variableName?: string;
  fileId?: string;
  action?: "read" | "search";
  searchQuery?: string;
};

// ─── Executor ─────────────────────────────────────────────────────────────────

export const googleDriveExecutor: NodeExecutor<GoogleDriveData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(googleDriveChannel().status({ nodeId, status: "loading" }));

  if (!data.action) {
    await publish(googleDriveChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError("Google Drive node: Action is required.");
  }

  if (!data.variableName) {
    await publish(googleDriveChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(
      "Google Drive node: Variable name is required.",
    );
  }

  if (data.action === "read" && !data.fileId) {
    await publish(googleDriveChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(
      "Google Drive node: File ID is required for read action.",
    );
  }

  if (data.action === "search" && !data.searchQuery) {
    await publish(googleDriveChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(
      "Google Drive node: Search query is required for search action.",
    );
  }

  try {
    const result = await step.run("google-drive-execute", async () => {
      const accessToken = await getGoogleToken({ userId });
      if (!accessToken) {
        throw new NonRetriableError(
          "Google Drive node: No Google account linked. Ask the user to connect Google in Settings.",
        );
      }

      if (data.action === "read") {
        return await readFile(
          data.fileId!,
          accessToken,
          context,
          data.variableName!,
        );
      }

      if (data.action === "search") {
        return await searchFiles(
          data.searchQuery!,
          accessToken,
          context,
          data.variableName!,
        );
      }

      throw new Error(`Unknown action: ${data.action}`);
    });

    await publish(googleDriveChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(googleDriveChannel().status({ nodeId, status: "error" }));

    if (error instanceof NonRetriableError) throw error;

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
      throw new NonRetriableError(
        `Google Drive: File not found or not accessible. Check:\n` +
          `1. File ID is correct\n` +
          `2. File is shared with your Google account\n` +
          `3. File hasn't been moved or deleted\n\n` +
          `Provided file ID: ${data.fileId || data.searchQuery}`,
      );
    }

    throw error;
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function readFile(
  fileId: string,
  accessToken: string,
  context: Record<string, unknown>,
  variableName: string,
): Promise<Record<string, unknown>> {
  const resolvedFileId = resolveTemplate(fileId, context) || fileId;

  const metaResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${resolvedFileId}?fields=id,name,mimeType,createdTime,modifiedTime,size`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!metaResponse.ok) {
    throw new NonRetriableError(
      `Failed to fetch file metadata: ${metaResponse.statusText}`,
    );
  }

  const metadata = await metaResponse.json();

  let downloadUrl: string;

  if (metadata.mimeType?.includes("application/vnd.google-apps")) {
    const exportMimeType =
      metadata.mimeType === "application/vnd.google-apps.document"
        ? "text/plain"
        : metadata.mimeType === "application/vnd.google-apps.spreadsheet"
          ? "text/csv"
          : "text/plain";

    downloadUrl = `https://www.googleapis.com/drive/v3/files/${resolvedFileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`;
  } else {
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${resolvedFileId}?alt=media`;
  }

  const downloadResponse = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!downloadResponse.ok) {
    if (downloadResponse.status === 403) {
      throw new NonRetriableError(
        `Google Drive: Permission denied. The file can't be accessed. This may happen if:\n` +
          `1. The file is restricted and not shared with your account\n` +
          `2. The OAuth scope needs 'drive.readonly' permission\n` +
          `3. Try re-authenticating your Google account in Settings`,
      );
    }
    throw new NonRetriableError(
      `Failed to download file: ${downloadResponse.statusText}`,
    );
  }

  let content: string;

  if (metadata.mimeType === "application/pdf") {
    try {
      const buffer = await downloadResponse.arrayBuffer();
      content = await parsePdf(Buffer.from(buffer));
    } catch (pdfError) {
      throw new NonRetriableError(
        `Failed to extract text from PDF: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`,
      );
    }
  } else {
    content = await downloadResponse.text();
  }

  return {
    ...context,
    [variableName]: {
      fileId: resolvedFileId,
      fileName: metadata.name,
      mimeType: metadata.mimeType,
      size: metadata.size,
      createdTime: metadata.createdTime,
      modifiedTime: metadata.modifiedTime,
      content,
      fetched_at: new Date().toISOString(),
    },
  };
}

async function searchFiles(
  query: string,
  accessToken: string,
  context: Record<string, unknown>,
  variableName: string,
): Promise<Record<string, unknown>> {
  const resolvedQuery = resolveTemplate(query, context) || query;

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(resolvedQuery)}&spaces=drive&pageSize=10&fields=files(id,name,mimeType,createdTime,modifiedTime,size)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    throw new NonRetriableError(
      `Failed to search Google Drive: ${response.statusText}`,
    );
  }

  const data = await response.json();

  return {
    ...context,
    [variableName]: {
      query: resolvedQuery,
      files: data.files || [],
      totalResults: (data.files || []).length,
      searched_at: new Date().toISOString(),
    },
  };
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const PDFParser = (await import("pdf2json")).default;

  return new Promise((resolve, reject) => {
    const parser = new PDFParser();

    parser.on("pdfParser_dataError", (err: { parserError: Error }) => {
      reject(err.parserError);
    });

    parser.on("pdfParser_dataReady", (pdfData: unknown) => {
      try {
        const data = pdfData as {
          Pages: Array<{
            Texts: Array<{ R: Array<{ T: string }> }>;
          }>;
        };

        const text = data.Pages.flatMap((page) =>
          page.Texts.flatMap((textItem) =>
            textItem.R.map((r) => {
              try {
                return decodeURIComponent(r.T);
              } catch {
                // If decoding fails, return the raw string as-is
                return r.T;
              }
            }),
          ),
        ).join(" ");

        resolve(text);
      } catch (e) {
        reject(e);
      }
    });

    parser.parseBuffer(buffer);
  });
}
