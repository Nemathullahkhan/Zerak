import fs from "fs";
import path from "path";

const easyPrompts = [
  {
    id: "wf_001",
    prompt: "Summarize a Google Form using AI and send it to Slack",
    complexity: "easy",
    expected_nodes: ["GOOGLE_FORM_TRIGGER", "MISTRAL", "SLACK"],
    expected_edges: [
      ["GOOGLE_FORM_TRIGGER", "MISTRAL"],
      ["MISTRAL", "SLACK"],
    ],
    expected_variables: ["formData", "aiSummary"],
    integration_count: 3,
    has_branch: false,
    has_loop: false,
    has_ai: true,
  },
  {
    id: "wf_002",
    prompt: "When a new file is uploaded to Google Drive, send a Gmail",
    complexity: "easy",
    expected_nodes: ["GOOGLE_DRIVE", "GMAIL"],
    expected_edges: [["GOOGLE_DRIVE", "GMAIL"]],
    expected_variables: ["fileData"],
    integration_count: 2,
    has_branch: false,
    has_loop: false,
    has_ai: false,
  },
  {
    id: "wf_003",
    prompt: "Add a row to Google Sheets from a Webhook",
    complexity: "easy",
    expected_nodes: ["HTTP_REQUEST", "GOOGLE_SHEETS"],
    expected_edges: [["HTTP_REQUEST", "GOOGLE_SHEETS"]],
    expected_variables: ["payload"],
    integration_count: 2,
    has_branch: false,
    has_loop: false,
    has_ai: false,
  },
  {
    id: "wf_004",
    prompt: "Send a Discord message when a Stripe payment is received",
    complexity: "easy",
    expected_nodes: ["STRIPE_TRIGGER", "DISCORD"],
    expected_edges: [["STRIPE_TRIGGER", "DISCORD"]],
    expected_variables: ["paymentData"],
    integration_count: 2,
    has_branch: false,
    has_loop: false,
    has_ai: false,
  },
  {
    id: "wf_005",
    prompt: "Fetch a URL and summarize with AI",
    complexity: "easy",
    expected_nodes: ["MANUAL_TRIGGER", "HTTP_REQUEST", "MISTRAL"],
    expected_edges: [
      ["MANUAL_TRIGGER", "HTTP_REQUEST"],
      ["HTTP_REQUEST", "MISTRAL"],
    ],
    expected_variables: ["htmlContent", "aiSummary"],
    integration_count: 2,
    has_branch: false,
    has_loop: false,
    has_ai: true,
  },
];

const mediumPrompts = [
  {
    id: "wf_041",
    prompt:
      "If a Google Form submission is positive, send Slack else send Gmail",
    complexity: "medium",
    expected_nodes: ["GOOGLE_FORM_TRIGGER", "MISTRAL", "IF", "SLACK", "GMAIL"],
    expected_edges: [
      ["GOOGLE_FORM_TRIGGER", "MISTRAL"],
      ["MISTRAL", "IF"],
      ["IF", "SLACK"],
      ["IF", "GMAIL"],
    ],
    expected_variables: ["formData", "sentiment", "branch"],
    integration_count: 4,
    has_branch: true,
    has_loop: false,
    has_ai: true,
  },
  {
    id: "wf_042",
    prompt: "Search files in Drive, for each file summarize and log to Sheets",
    complexity: "medium",
    expected_nodes: [
      "MANUAL_TRIGGER",
      "GOOGLE_DRIVE",
      "LOOP",
      "MISTRAL",
      "GOOGLE_SHEETS",
    ],
    expected_edges: [
      ["MANUAL_TRIGGER", "GOOGLE_DRIVE"],
      ["GOOGLE_DRIVE", "LOOP"],
      ["LOOP", "MISTRAL"],
      ["MISTRAL", "GOOGLE_SHEETS"],
    ],
    expected_variables: ["files", "fileItem", "aiSummary"],
    integration_count: 3,
    has_branch: false,
    has_loop: true,
    has_ai: true,
  },
];

const hardPrompts = [
  {
    id: "wf_101",
    prompt:
      "Complex lead scoring: Fetch from Sheets, AI analyze, if high score loop through contacts and send personalized emails",
    complexity: "hard",
    expected_nodes: [
      "MANUAL_TRIGGER",
      "GOOGLE_SHEETS",
      "MISTRAL",
      "IF",
      "LOOP",
      "MISTRAL",
      "GMAIL",
    ],
    expected_edges: [
      ["MANUAL_TRIGGER", "GOOGLE_SHEETS"],
      ["GOOGLE_SHEETS", "MISTRAL"],
      ["MISTRAL", "IF"],
      ["IF", "LOOP"],
      ["LOOP", "MISTRAL"],
      ["MISTRAL", "GMAIL"],
    ],
    expected_variables: [
      "leads",
      "score",
      "contacts",
      "contactItem",
      "emailBody",
    ],
    integration_count: 4,
    has_branch: true,
    has_loop: true,
    has_ai: true,
  },
];

function generate() {
  const prompts = [];

  // Fill Easy (up to 40)
  for (let i = 0; i < 40; i++) {
    const base = easyPrompts[i % easyPrompts.length];
    prompts.push({ ...base, id: `wf_${(i + 1).toString().padStart(3, "0")}` });
  }

  // Fill Medium (up to 60)
  for (let i = 0; i < 60; i++) {
    const base = mediumPrompts[i % mediumPrompts.length];
    prompts.push({ ...base, id: `wf_${(41 + i).toString().padStart(3, "0")}` });
  }

  // Fill Hard (up to 40)
  for (let i = 0; i < 40; i++) {
    const base = hardPrompts[i % hardPrompts.length];
    prompts.push({
      ...base,
      id: `wf_${(101 + i).toString().padStart(3, "0")}`,
    });
  }

  fs.writeFileSync(
    path.resolve(__dirname, "../dataset/prompts.json"),
    JSON.stringify(prompts, null, 2),
  );
  console.log(
    `Generated ${prompts.length} prompts in benchmark/dataset/prompts.json`,
  );
}

generate();
