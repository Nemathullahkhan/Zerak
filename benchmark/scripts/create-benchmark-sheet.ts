// create-benchmark-sheet.ts
import { google } from "googleapis";
import { getGoogleToken } from "@/lib/google-token";

const BENCHMARK_USER_ID = "rtCTm1oS1UFJe1cO5cWnSLsQTds3heTP";

async function createBenchmarkSheet() {
  const tokens = await getGoogleToken({ userId: BENCHMARK_USER_ID });
  const auth = new google.auth.OAuth2();
  auth.setCredentials(tokens);

  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  const createResponse = await sheets.spreadsheets.create({
    requestBody: { properties: { title: "Zerak Benchmark" } },
  });
  const spreadsheetId = createResponse.data.spreadsheetId!;
  console.log(`✅ Created spreadsheet: ${spreadsheetId}`);
  console.log(`🔗 https://docs.google.com/spreadsheets/d/${spreadsheetId}`);

  const tabs = [
    "Leads",
    "Topics",
    "Sales",
    "Support",
    "IT",
    "Docs",
    "BenchmarkData",
  ];
  for (const tab of tabs) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tab } } }],
      },
    });
    // Add header row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1:D1`,
      valueInputOption: "RAW",
      requestBody: { values: [["id", "data", "timestamp", "workflow_id"]] },
    });
  }

  // Dummy data for Topics (used by wf_003)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Topics!A2:B3",
    valueInputOption: "RAW",
    requestBody: {
      values: [
        ["AI trends", "Write about LLM agents"],
        ["Cloud security", "Best practices for 2026"],
      ],
    },
  });

  // Dummy data for Sales (used by wf_015)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Sales!A2:C3",
    valueInputOption: "RAW",
    requestBody: {
      values: [
        ["Q1", 125000, "USD"],
        ["Q2", 142000, "USD"],
      ],
    },
  });

  console.log(`\n✅ Benchmark sheet ready. Set in .env:`);
  console.log(`BENCHMARK_SPREADSHEET_ID=${spreadsheetId}`);
  console.log(`BENCHMARK_SHEET_NAME=BenchmarkData`);
}

createBenchmarkSheet().catch(console.error);
