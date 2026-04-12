/**
 * benchmark/scripts/setup-google-sheet.ts
 *
 * Creates one Google Spreadsheet named "Zerak Benchmark"
 * with pre-populated tabs for every GOOGLE_SHEETS-using prompt in prompts.json.
 *
 * Usage:
 *   BENCHMARK_USER_ID=<userId> npx tsx benchmark/scripts/setup-google-sheet.ts
 *
 * On success it prints:
 *   BENCHMARK_SPREADSHEET_ID=<id>
 * Copy that into your .env.
 */

import dotenv from "dotenv";
import path from "path";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const prisma = new PrismaClient();

// ─── Types ────────────────────────────────────────────────────────────────────

interface SheetTab {
  name: string;
  headers: string[];
  rows: string[][];
}

// ─── Sheet definitions ────────────────────────────────────────────────────────
// One tab per logical domain used in prompts.json

const TABS: SheetTab[] = [
  // wf_001, wf_011, wf_012 — CRM / Leads
  {
    name: "Leads",
    headers: ["Name", "Email", "Company", "Role", "Status", "Score", "LinkedIn", "LastContacted"],
    rows: [
      ["Alice Johnson", "alice@acmecorp.com", "Acme Corp", "VP Engineering", "New", "85", "https://linkedin.com/in/alice", ""],
      ["Bob Martinez", "bob@techwave.io", "TechWave", "CTO", "Contacted", "72", "https://linkedin.com/in/bob", "2026-04-01"],
      ["Carol Smith", "carol@finova.com", "Finova", "CEO", "Qualified", "95", "https://linkedin.com/in/carol", "2026-04-05"],
      ["David Lee", "david@startup.co", "Startup Co", "Founder", "New", "60", "https://linkedin.com/in/david", ""],
      ["Emma Wilson", "emma@enterprise.com", "Enterprise Ltd", "Director", "Closed", "88", "https://linkedin.com/in/emma", "2026-03-28"],
    ],
  },

  // wf_003 — Content topics for blog outline generation
  {
    name: "ContentTopics",
    headers: ["Topic", "Category", "Priority", "Keyword", "AssignedTo", "Status"],
    rows: [
      ["How AI is transforming supply chains", "Technology", "High", "AI supply chain", "Alice", "Pending"],
      ["Top 10 productivity hacks for remote teams", "Productivity", "Medium", "remote work tips", "Bob", "In Progress"],
      ["The future of no-code automation", "Technology", "High", "no-code automation", "Alice", "Pending"],
      ["Building a sustainable brand in 2026", "Marketing", "Low", "sustainable branding", "Carol", "Pending"],
      ["Customer retention strategies that work", "Sales", "High", "customer retention", "David", "Pending"],
    ],
  },

  // wf_004 — Social media posts
  {
    name: "SocialPosts",
    headers: ["PostLink", "Platform", "Caption", "Hashtags", "Date", "Status"],
    rows: [
      ["https://instagram.com/p/abc123", "Instagram", "", "", "2026-04-10", "Published"],
      ["https://instagram.com/p/def456", "Instagram", "", "", "2026-04-09", "Published"],
      ["https://instagram.com/p/ghi789", "Instagram", "", "", "2026-04-08", "Published"],
    ],
  },

  // wf_015 — Sales performance
  {
    name: "SalesPerformance",
    headers: ["Rep", "Region", "Q1Revenue", "Q2Revenue", "DealsWon", "DealsLost", "ConversionRate", "Target"],
    rows: [
      ["Alice Johnson", "North", "125000", "138000", "22", "8", "73%", "150000"],
      ["Bob Martinez", "South", "98000", "112000", "18", "12", "60%", "120000"],
      ["Carol Smith", "East", "210000", "195000", "31", "5", "86%", "200000"],
      ["David Lee", "West", "75000", "88000", "14", "9", "61%", "100000"],
      ["Emma Wilson", "Central", "160000", "172000", "26", "6", "81%", "170000"],
    ],
  },

  // wf_016, wf_020 — Invoice / Document metadata
  {
    name: "Invoices",
    headers: ["InvoiceNumber", "Vendor", "Date", "Amount", "Status", "DueDate", "Summary"],
    rows: [
      ["INV-2026-001", "Cloud Providers Inc", "2026-03-01", "4500.00", "Paid", "2026-03-31", ""],
      ["INV-2026-002", "Office Supplies Co", "2026-03-10", "320.50", "Pending", "2026-04-10", ""],
      ["INV-2026-003", "Marketing Agency Ltd", "2026-03-15", "12000.00", "Overdue", "2026-04-01", ""],
      ["INV-2026-004", "IT Services Corp", "2026-03-20", "8750.00", "Pending", "2026-04-20", ""],
      ["INV-2026-005", "Legal Associates", "2026-03-25", "2200.00", "Paid", "2026-04-05", ""],
    ],
  },

  // wf_013 — Outreach profiles
  {
    name: "OutreachProfiles",
    headers: ["Name", "Company", "LinkedIn", "Industry", "IceBreaker", "EmailSent"],
    rows: [
      ["James Brown", "GrowthLabs", "https://linkedin.com/in/jamesbrown", "SaaS", "", "No"],
      ["Sarah Chen", "DataFlow AI", "https://linkedin.com/in/sarahchen", "AI/ML", "", "No"],
      ["Michael Davis", "RetailChain Global", "https://linkedin.com/in/mdavis", "Retail", "", "No"],
      ["Priya Patel", "FinTech Solutions", "https://linkedin.com/in/priyapatel", "Finance", "", "No"],
    ],
  },

  // wf_025 — Support tickets
  {
    name: "SupportTickets",
    headers: ["TicketID", "Customer", "Issue", "Priority", "Status", "CreatedAt", "ResolvedAt", "Agent"],
    rows: [
      ["TKT-001", "Acme Corp", "Login page not loading after update", "High", "Open", "2026-04-10 09:00", "", ""],
      ["TKT-002", "TechWave", "Billing discrepancy on March invoice", "Critical", "Open", "2026-04-10 09:30", "", ""],
      ["TKT-003", "Finova", "API rate limits exceeded unexpectedly", "Medium", "Open", "2026-04-10 10:00", "", ""],
      ["TKT-004", "Startup Co", "Export to CSV feature broken", "Low", "Open", "2026-04-09 14:00", "", ""],
      ["TKT-005", "Enterprise Ltd", "SSO integration failing for SAML", "Critical", "Open", "2026-04-09 11:00", "", ""],
      ["TKT-006", "GrowthLabs", "Dashboard graphs not rendering on Safari", "Medium", "Open", "2026-04-09 08:00", "", ""],
      ["TKT-007", "DataFlow AI", "Webhook events delayed by 10+ minutes", "High", "Open", "2026-04-08 16:00", "", ""],
    ],
  },

  // General catch-all for any prompt that writes to sheets
  {
    name: "BenchmarkData",
    headers: ["WorkflowId", "Timestamp", "NodeType", "Result", "Notes"],
    rows: [
      ["wf_001", "2026-04-10T00:00:00Z", "GOOGLE_SHEETS", "append", "Benchmark seed row"],
    ],
  },
];

// ─── Google Sheets API helpers ────────────────────────────────────────────────

async function getAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "google" },
  });

  if (!account?.accessToken) {
    throw new Error(
      `No Google account linked to userId="${userId}". ` +
      `Log in via the app first so an OAuth Account row is created.`
    );
  }

  // Refresh if expired
  const isExpired =
    account.accessTokenExpiresAt &&
    account.accessTokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000;

  if (isExpired && account.refreshToken) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: account.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
    const { access_token } = await res.json();
    return access_token as string;
  }

  return account.accessToken as string;
}

async function createSpreadsheet(
  accessToken: string,
  title: string,
  tabs: SheetTab[]
): Promise<string> {
  const body = {
    properties: { title },
    sheets: tabs.map((tab, i) => ({
      properties: {
        sheetId: i,
        title: tab.name,
        index: i,
        gridProperties: { rowCount: 100, columnCount: tab.headers.length },
      },
    })),
  };

  const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Create spreadsheet failed: ${await res.text()}`);

  const data = await res.json() as { spreadsheetId: string };
  return data.spreadsheetId;
}

async function populateTab(
  accessToken: string,
  spreadsheetId: string,
  tab: SheetTab
): Promise<void> {
  const values = [tab.headers, ...tab.rows];
  const range = `${tab.name}!A1`;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!res.ok) throw new Error(`Populate tab "${tab.name}" failed: ${await res.text()}`);
}

async function boldHeaderRow(
  accessToken: string,
  spreadsheetId: string,
  sheetIndex: number,
  colCount: number
): Promise<void> {
  const req = {
    requests: [
      {
        repeatCell: {
          range: {
            sheetId: sheetIndex,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: colCount,
          },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.2, green: 0.47, blue: 0.9 },
              horizontalAlignment: "CENTER",
            },
          },
          fields: "userEnteredFormat(textFormat,backgroundColor,horizontalAlignment)",
        },
      },
      {
        autoResizeDimensions: {
          dimensions: {
            sheetId: sheetIndex,
            dimension: "COLUMNS",
            startIndex: 0,
            endIndex: colCount,
          },
        },
      },
    ],
  };

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    }
  );

  if (!res.ok) throw new Error(`Format sheet ${sheetIndex} failed: ${await res.text()}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const userId = process.env.BENCHMARK_USER_ID;
  if (!userId) {
    console.error("❌ BENCHMARK_USER_ID env var is required.");
    console.error("   Run: BENCHMARK_USER_ID=<yourUserId> npx tsx benchmark/scripts/setup-google-sheet.ts");
    process.exit(1);
  }

  console.log(`\n🔐 Getting Google access token for user: ${userId}`);
  const accessToken = await getAccessToken(userId);
  console.log("   ✅ Token retrieved");

  console.log("\n📊 Creating spreadsheet: \"Zerak Benchmark\"");
  const spreadsheetId = await createSpreadsheet(accessToken, "Zerak Benchmark", TABS);
  console.log(`   ✅ Created: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);

  console.log("\n📝 Populating tabs...");
  for (let i = 0; i < TABS.length; i++) {
    const tab = TABS[i];
    process.stdout.write(`   • ${tab.name.padEnd(20)}`);
    await populateTab(accessToken, spreadsheetId, tab);
    await boldHeaderRow(accessToken, spreadsheetId, i, tab.headers.length);
    console.log("✅");
  }

  console.log("\n─────────────────────────────────────────────────────────────");
  console.log("✅ Done! Add this to your .env:\n");
  console.log(`BENCHMARK_SPREADSHEET_ID=${spreadsheetId}`);
  console.log(`BENCHMARK_SHEET_NAME=BenchmarkData`);
  console.log("─────────────────────────────────────────────────────────────");
  console.log("\nTab names you can use for BENCHMARK_SHEET_NAME:");
  TABS.forEach(t => console.log(`  • ${t.name}`));
  console.log();
}

main()
  .catch((err) => {
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
