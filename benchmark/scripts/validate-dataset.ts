import { z } from "zod";
import fs from "fs";
import path from "path";
import { NodeType } from "../../src/generated/prisma/enums";

const PromptSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  complexity: z.enum(["easy", "medium", "hard"]),
  expected_nodes: z.array(z.nativeEnum(NodeType)),
  expected_edges: z.array(z.tuple([z.string(), z.string()])),
  expected_variables: z.array(z.string()),
  integration_count: z.number(),
  has_branch: z.boolean(),
  has_loop: z.boolean(),
  has_ai: z.boolean(),
  notes: z.string().optional(),
});

const InvalidDAGSchema = z.object({
  id: z.string(),
  category: z.enum([
    "Cycle",
    "Orphan node",
    "Bad variable reference",
    "Missing credential",
    "No trigger",
    "Multiple triggers",
  ]),
  nodes: z.array(z.any()),
  connections: z.array(z.any()),
});

function validate() {
  const promptsPath = path.resolve(__dirname, "../dataset/prompts.json");
  const invalidDagsPath = path.resolve(__dirname, "../dataset/invalid-dags.json");

  console.log("--- Dataset Validation ---");

  // Validate Prompts
  if (fs.existsSync(promptsPath)) {
    try {
      const prompts = JSON.parse(fs.readFileSync(promptsPath, "utf8"));
      const result = z.array(PromptSchema).safeParse(prompts);
      if (!result.success) {
        console.error("❌ Prompts validation failed:", result.error.format());
        process.exit(1);
      }
      console.log(`✅ Prompts validated successfully (${prompts.length} entries)`);
      
      // Check for duplicate IDs
      const ids = prompts.map((p: any) => p.id);
      if (new Set(ids).size !== ids.length) {
        console.error("❌ Duplicate prompt IDs found");
        process.exit(1);
      }

      // Verify AI prompts use MISTRAL
      const nonMistralAI = prompts.filter((p: any) => 
        p.has_ai && !p.expected_nodes.includes("MISTRAL")
      );
      if (nonMistralAI.length > 0) {
        console.warn(`⚠️ Warning: ${nonMistralAI.length} AI prompts do not use MISTRAL node (ids: ${nonMistralAI.map((p: any) => p.id).join(", ")})`);
      }

    } catch (e) {
      console.error("❌ Error reading/parsing prompts.json:", e);
      process.exit(1);
    }
  } else {
    console.warn("⚠️ prompts.json not found, skipping...");
  }

  // Validate Invalid DAGs
  if (fs.existsSync(invalidDagsPath)) {
    try {
      const invalidDags = JSON.parse(fs.readFileSync(invalidDagsPath, "utf8"));
      const result = z.array(InvalidDAGSchema).safeParse(invalidDags);
      if (!result.success) {
        console.error("❌ Invalid DAGs validation failed:", result.error.format());
        process.exit(1);
      }
      console.log(`✅ Invalid DAGs validated successfully (${invalidDags.length} entries)`);
    } catch (e) {
      console.error("❌ Error reading/parsing invalid-dags.json:", e);
      process.exit(1);
    }
  } else {
    console.warn("⚠️ invalid-dags.json not found, skipping...");
  }
}

if (require.main === module) {
  validate();
}

export { PromptSchema, InvalidDAGSchema };
