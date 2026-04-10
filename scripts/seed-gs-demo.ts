import { PrismaClient, NodeType } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const userId = "rtCTm1oS1UFJe1cO5cWnSLsQTds3heTP";

async function main() {
  console.log(
    `Updating 'Google Sheets Re-engagement' template for user: ${userId}`,
  );

  // Delete existing demo workflow if it exists to avoid unique constraint errors
  await prisma.workflow.deleteMany({
    where: {
      name: "Google Sheets Re-engagement",
      userId: userId,
    },
  });

  const gsWorkflow = await prisma.workflow.create({
    data: {
      name: "Google Sheets Re-engagement",
      userId,
      nodes: {
        create: [
          {
            id: "gs-trigger",
            name: "Trigger Run",
            type: NodeType.MANUAL_TRIGGER,
            position: { x: 100, y: 100 },
            data: { variableName: "trigger" },
          },
          {
            id: "gs-read",
            name: "Read Inactive Customers",
            type: NodeType.GOOGLE_SHEETS,
            position: { x: 300, y: 100 },
            data: {
              action: "read",
              spreadsheetId: "1X...your_demo_sheet_id...",
              sheetName: "Sheet1",
              range: "Sheet1!A2:D100", // Start from row 2 to skip headers
              variableName: "customers",
            },
          },
          {
            id: "gs-loop",
            name: "For Each Customer",
            type: NodeType.LOOP,
            position: { x: 500, y: 100 },
            data: {
              sourceVariable: "customers.values",
              itemVariable: "customer",
              variableName: "loopProgress",
            },
          },
          {
            id: "gs-ai",
            name: "Generate Personalized Offer",
            type: NodeType.ANTHROPIC,
            position: { x: 700, y: 100 },
            data: {
              model: "claude-3-5-sonnet",
              systemPrompt: "You are a professional copywriter specializing in re-engagement campaigns.",
              userPrompt:
                "Analyze this customer data: {{customer}}. \n\n- Name: {{customer[0]}}\n- Email: {{customer[1]}}\n- Status: {{customer[2]}}\n- Category: {{customer[3]}}\n\nIf the Status is 'Not Connected', write a persuasive 20% discount offer for their favorite category ({{customer[3]}}). If they are already 'Connected', write a warm 'We miss you' check-in note instead. Use the discount code: ZERAK20 for the offers.",
              variableName: "emailDraft",
            },
          },
          {
            id: "gs-gmail",
            name: "Send to Customer",
            type: NodeType.GMAIL,
            position: { x: 900, y: 100 },
            data: {
              to: "{{customer[1]}}",
              subject: "A special gift from us, {{customer[0]}}!",
              body: "{{emailDraft.text}}",
              variableName: "sentMail",
            },
          },
        ],
      },
      connections: {
        create: [
          {
            fromNodeId: "gs-trigger",
            toNodeId: "gs-read",
            fromOutput: "source-1",
            toInput: "target-1",
          },
          {
            fromNodeId: "gs-read",
            toNodeId: "gs-loop",
            fromOutput: "source-1",
            toInput: "target-1",
          },
          {
            fromNodeId: "gs-loop",
            toNodeId: "gs-ai",
            fromOutput: "source-1",
            toInput: "target-1",
          },
          {
            fromNodeId: "gs-ai",
            toNodeId: "gs-gmail",
            fromOutput: "source-1",
            toInput: "target-1",
          },
        ],
      },
    },
  });

  console.log("'Google Sheets Re-engagement' workflow created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
