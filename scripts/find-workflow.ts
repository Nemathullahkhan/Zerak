import { PrismaClient } from "../src/generated/prisma/client";
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
  const workflow = await prisma.workflow.findFirst({
    where: { 
      name: "Promotional mails", 
      userId: userId 
    },
    include: {
      nodes: true,
      connections: true
    }
  });

  if (workflow) {
    console.log("WORKFLOW_FOUND");
    console.log(JSON.stringify(workflow, null, 2));
  } else {
    console.log("WORKFLOW_NOT_FOUND");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
