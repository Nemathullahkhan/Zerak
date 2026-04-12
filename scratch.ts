import dotenv from "dotenv";
dotenv.config();

async function run() {
  const prompt = "When a new lead submits a Google Form, create a GOOGLE_FORM_TRIGGER node with variableName 'formData'. Then create a MISTRAL node named 'CategorizeLead' with model 'mistral-large-latest' and this exact userPrompt: 'Analyze the formData and categorize the lead interest level as High, Medium or Low. Return only JSON with keys category and reason.'. Then create a GMAIL node named 'SendWelcomeEmail' that sends to 'lead@company.com' with subject 'Welcome' and body 'Hi, your interest level is {{CategorizeLead.category}}. Reason: {{CategorizeLead.reason}}'. Finally create a GOOGLE_SHEETS node named 'AppendLead' with action 'append', spreadsheetId '1d5g9yPszvzE8BgcxAX_okP1DX7dzjCH-Y60JYUj0nBc', sheetName 'Leads', range 'A:D'. Connect them in this exact order: GOOGLE_FORM_TRIGGER → MISTRAL → GMAIL → GOOGLE_SHEETS.";

  const response = await fetch("http://localhost:3000/api/workflow/stream?benchmark=true", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No reader");

  let content = "";
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    content += decoder.decode(value, { stream: true });
    process.stdout.write(decoder.decode(value, { stream: true }));
  }
  process.stdout.write("\nDONE\n");
}
run();
