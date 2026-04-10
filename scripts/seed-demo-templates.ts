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
  console.log(`Seeding demo templates for user: ${userId}`);

  // Template 1: Intelligent Lead Enrichment
  const leadEnrichment = await prisma.workflow.create({
    data: {
      name: "Intelligent Lead Enrichment",
      userId,
      nodes: {
        create: [
          {
            id: "trigger-1",
            name: "Manual Trigger",
            type: NodeType.MANUAL_TRIGGER,
            position: { x: 100, y: 100 },
            data: { variableName: "trigger" },
          },
          {
            id: "scrape-1",
            name: "Scrape Company Site",
            type: NodeType.HTTP_REQUEST,
            position: { x: 300, y: 100 },
            data: {
              url: "https://{{trigger.company_url}}",
              method: "GET",
              variableName: "siteContent",
            },
          },
          {
            id: "ai-1",
            name: "Analyze Lead",
            type: NodeType.ANTHROPIC,
            position: { x: 500, y: 100 },
            data: {
              model: "claude-3-5-sonnet",
              systemPrompt: "You are a sales qualification assistant.",
              userPrompt:
                "Analyze this website content and tell me if they are an AI or Software company: {{siteContent.body}}",
              variableName: "analysis",
            },
          },
          {
            id: "slack-1",
            name: "Slack Alert",
            type: NodeType.SLACK,
            position: { x: 700, y: 100 },
            data: {
              content:
                "New qualified lead found! {{trigger.full_name}} from {{trigger.company_url}}. Analysis: {{analysis.text}}",
              variableName: "slackNotify",
            },
          },
        ],
      },
      connections: {
        create: [
          {
            fromNodeId: "trigger-1",
            toNodeId: "scrape-1",
            fromOutput: "source-1",
            toInput: "target-1",
          },
          {
            fromNodeId: "scrape-1",
            toNodeId: "ai-1",
            fromOutput: "source-1",
            toInput: "target-1",
          },
          {
            fromNodeId: "ai-1",
            toNodeId: "slack-1",
            fromOutput: "source-1",
            toInput: "target-1",
          },
        ],
      },
    },
  });

  // Template 2: Smart Order Fulfillment
  const orderFulfillment = await prisma.workflow.create({
    data: {
      name: "Smart Order Fulfillment",
      userId,
      nodes: {
        create: [
          {
            id: "t2-trigger",
            name: "Order Received",
            type: NodeType.MANUAL_TRIGGER,
            position: { x: 100, y: 100 },
            data: { variableName: "order" },
          },
          {
            id: "t2-check",
            name: "Check Inventory",
            type: NodeType.HTTP_REQUEST,
            position: { x: 300, y: 100 },
            data: {
              url: "https://api.mystore.com/inventory/{{order.sku}}",
              method: "GET",
              variableName: "inventory",
            },
          },
          {
            id: "t2-gmail",
            name: "Send Confirmation",
            type: NodeType.GMAIL,
            position: { x: 500, y: 100 },
            data: {
              to: "{{order.customer_email}}",
              subject: "Your order is confirmed!",
              body: "Hi! We have your {{order.product_name}} in stock and it will ship today.",
              variableName: "email",
            },
          },
        ],
      },
      connections: {
        create: [
          {
            fromNodeId: "t2-trigger",
            toNodeId: "t2-check",
            fromOutput: "source-1",
            toInput: "target-1",
          },
          {
            fromNodeId: "t2-check",
            toNodeId: "t2-gmail",
            fromOutput: "source-1",
            toInput: "target-1",
          },
        ],
      },
    },
  });

  // Template 3: Sentiment Escalation
  const sentimentEscalation = await prisma.workflow.create({
    data: {
      name: "Sentiment Escalation",
      userId,
      nodes: {
        create: [
          {
            id: "t3-trigger",
            name: "Feedback Form",
            type: NodeType.MANUAL_TRIGGER,
            position: { x: 100, y: 100 },
            data: { variableName: "feedback" },
          },
          {
            id: "t3-ai",
            name: "Analyze Sentiment",
            type: NodeType.ANTHROPIC,
            position: { x: 300, y: 100 },
            data: {
              model: "claude-3-5-sonnet",
              systemPrompt: "You are a customer success assistant.",
              userPrompt:
                "Is this customer angry or requesting a refund? Feedback: {{feedback.comment}}",
              variableName: "sentiment",
            },
          },
          {
            id: "t3-slack",
            name: "Escalate to Manager",
            type: NodeType.SLACK,
            position: { x: 500, y: 100 },
            data: {
              content:
                "Urgent: Negative feedback from {{feedback.customer_name}}. AI Analysis: {{sentiment.text}}",
              variableName: "escalation",
            },
          },
        ],
      },
      connections: {
        create: [
          {
            fromNodeId: "t3-trigger",
            toNodeId: "t3-ai",
            fromOutput: "source-1",
            toInput: "target-1",
          },
          {
            fromNodeId: "t3-ai",
            toNodeId: "t3-slack",
            fromOutput: "source-1",
            toInput: "target-1",
          },
        ],
      },
    },
  });

  console.log("Templates seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
