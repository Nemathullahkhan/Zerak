///patch-nodes.ts
export function patchNodesForBenchmark(nodes: any[], promptId?: string) {
  const mistralCredId = process.env.BENCHMARK_MISTRAL_CREDENTIAL_ID;
  const discordWebhook = process.env.BENCHMARK_DISCORD_WEBHOOK_URL;
  const spreadsheetId = process.env.BENCHMARK_SPREADSHEET_ID;
  const defaultSheet = process.env.BENCHMARK_SHEET_NAME || "BenchmarkData";
  const driveFileId = process.env.BENCHMARK_DRIVE_FILE_ID;

  // Map prompt IDs to specific sheet tabs (optional)
  const tabMap: Record<string, string> = {
    wf_001: "Leads",
    wf_003: "Topics",
    wf_011: "Leads",
    wf_015: "Sales",
    wf_025: "Support",
    wf_009: "IT",
    wf_020: "Docs",
  };
  const sheetName = (promptId && tabMap[promptId]) ? tabMap[promptId] : defaultSheet;

  return nodes.map((node) => {
    const patched = { ...node, data: { ...node.data } };

    // Mistral: inject credentialId
    if (node.type === "MISTRAL" && mistralCredId) {
      patched.data.credentialId = mistralCredId;
    }

    // Discord: inject webhook URL
    if (node.type === "DISCORD" && discordWebhook) {
      patched.data.webhookUrl = discordWebhook;
    }

    // Google Sheets: force spreadsheetId and sheetName
    if (node.type === "GOOGLE_SHEETS" && spreadsheetId) {
      patched.data.spreadsheetId = spreadsheetId;
      patched.data.sheetName = sheetName;
      patched.data.range = node.data.range || "A1:Z100";
    }

    // Google Drive: inject fileId for read actions (optional)
    if (node.type === "GOOGLE_DRIVE" && driveFileId && node.data?.action === "read") {
      patched.data.fileId = driveFileId;
    }

    // GMAIL, GOOGLE_FORM_TRIGGER, GOOGLE_DRIVE (write) need no patching – use OAuth
    return patched;
  });
}