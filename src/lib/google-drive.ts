import { getGoogleToken } from "@/lib/google-token";

export interface DriveFileOptions {
  fileId: string;
  userId: string;
  mimeType?: "text/plain" | "application/pdf" | "text/html" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

/**
 * Fetch file content from Google Drive
 * Supports text files, PDFs, and documents
 */
export async function getGoogleDriveFile({
  fileId,
  userId,
  mimeType = "text/plain",
}: DriveFileOptions): Promise<string> {
  try {
    const accessToken = await getGoogleToken({ userId });
    if (!accessToken) {
      throw new Error("Google Drive: No Google account linked");
    }

    // For native Google formats, use export API
    if (mimeType.includes("google")) {
      const exportMimeType = mimeType === "application/vnd.google-apps.document"
        ? "text/plain"
        : mimeType === "application/vnd.google-apps.spreadsheet"
        ? "text/csv"
        : "text/plain";

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) {
        throw new Error(`Google Drive export failed: ${response.statusText}`);
      }

      return await response.text();
    }

    // For regular files, use download API
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Google Drive fetch failed: ${response.statusText}`);
    }

    const content = await response.text();
    return content;
  } catch (error) {
    throw new Error(
      `Failed to fetch Google Drive file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Search for files in Google Drive
 */
export async function searchGoogleDriveFiles({
  query,
  userId,
  limit = 10,
}: {
  query: string;
  userId: string;
  limit?: number;
}): Promise<any[]> {
  try {
    const accessToken = await getGoogleToken({ userId });
    if (!accessToken) {
      throw new Error("Google Drive: No Google account linked");
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive&pageSize=${limit}&fields=files(id,name,mimeType,createdTime,modifiedTime)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Google Drive search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    throw new Error(
      `Failed to search Google Drive: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
