import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  const userId = process.env.BENCHMARK_USER_ID;
  if (!userId) {
     console.log("No BENCHMARK_USER_ID");
     return;
  }
  const creds = await prisma.credential.findMany({ where: { userId } });
  console.log("Credentials for the benchmark user:");
  for (const c of creds) {
    console.log(`- ID: ${c.id}, Name: ${c.name}, Value snippet: ${c.value.substring(0,10)}...`);
  }
  
  const allMistral = await prisma.credential.findMany({ where: { name: { contains: "Mistral", mode: "insensitive" } } });
  console.log("All Mistral creds in DB:");
  for (const c of allMistral) {
     console.log(`- ID: ${c.id}, Name: ${c.name}, User: ${c.userId}`);
  }
  
  await prisma.$disconnect();
}
run();
