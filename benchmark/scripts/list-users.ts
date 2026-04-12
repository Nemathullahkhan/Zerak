// @ts-ignore
import { PrismaClient } from "../../src/generated/prisma/client.js";
const p = new PrismaClient();
p.user.findMany({ select: { id: true, email: true, name: true } })
  .then(users => {
    console.log("\nUsers in DB:");
    users.forEach(u => console.log(`  id: ${u.id}  email: ${u.email}  name: ${u.name}`));
    if (users.length === 0) console.log("  (no users found)");
  })
  .finally(() => p.$disconnect());
