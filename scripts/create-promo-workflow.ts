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
  console.log(`Creating 'Promotional mails' template for user: ${userId}`);

  const promotionalMails = await prisma.workflow.create({
    data: {
      name: "Promotional mails",
      userId,
      nodes: {
        create: [
          {
            id: "t4-trigger",
            name: "Schedule Run",
            type: NodeType.MANUAL_TRIGGER, // Using manual for demo, can be switched to CRON
            position: { x: 100, y: 100 },
            data: { variableName: "trigger" },
          },
          {
            id: "t4-db",
            name: "Fetch Inactive Customers",
            type: NodeType.HTTP_REQUEST, // Simulating a DB fetch
            position: { x: 300, y: 100 },
            data: { 
              url: "https://api.mystore.com/customers/inactive", 
              method: "GET", 
              variableName: "customers" 
            },
          },
          {
            id: "t4-ai",
            name: "Personalize Offer",
            type: NodeType.ANTHROPIC,
            position: { x: 500, y: 100 },
            data: {
              model: "claude-3-5-sonnet",
              systemPrompt: "You are a marketing specialist.",
              userPrompt: "Write a personalized email for {{customers.name}}. Their last purchase was {{customers.last_purchase}}. Offer them a 20% discount on their favorite category: {{customers.favorite_category}}.",
              variableName: "personalizedEmail"
            },
          },
          {
            id: "t4-gmail",
            name: "Send Promo Email",
            type: NodeType.GMAIL,
            position: { x: 700, y: 100 },
            data: {
              to: "{{customers.email}}",
              subject: "We miss you! Here is a special gift.",
              body: "{{personalizedEmail.text}}",
              variableName: "sentMail"
            },
          }
        ],
      },
      connections: {
        create: [
          { fromNodeId: "t4-trigger", toNodeId: "t4-db", fromOutput: "source-1", toInput: "target-1" },
          { fromNodeId: "t4-db", toNodeId: "t4-ai", fromOutput: "source-1", toInput: "target-1" },
          { fromNodeId: "t4-ai", toNodeId: "t4-gmail", fromOutput: "source-1", toInput: "target-1" },
        ]
      }
    }
  });

  console.log("'Promotional mails' workflow created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
