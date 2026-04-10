-- Fix workflow to properly handle emailInference inside loop context
-- This script updates the emailRecords CODE node to correctly access loop and inference data

UPDATE "WorkflowNode"
SET "data" = jsonb_set(
  "data",
  '{code}',
  '"const job = context.jobLoop;
const htmlContent = context.emailHtml.aiResponse || context.emailHtml._output || \"\";

let inferData = { 
  email: \"\", 
  confidenceLevel: \"low\", 
  confidenceScore: 0, 
  reasoning: \"\" 
};

try {
  const raw = context.emailInference.aiResponse || context.emailInference._output;
  if (raw) {
    // Remove markdown code fences if present
    const cleanedRaw = raw.replace(/^```json\s*/, \"\").replace(/\s*```$/, \"\").trim();
    const parsed = typeof cleanedRaw === \"string\" ? JSON.parse(cleanedRaw) : cleanedRaw;
    if (parsed && parsed.email) {
      inferData = parsed;
    }
  }
} catch(e) {
  console.error(\"Failed to parse emailInference:\", e);
}

return {
  jobTitle: job.jobData?.jobTitle || job.jobTitle || \"\",
  companyName: job.jobData?.companyName || job.companyName || \"\",
  matchScore: job.matchScore || 0,
  emailTo: inferData.email,
  confidenceLevel: inferData.confidenceLevel,
  confidenceScore: inferData.confidenceScore,
  reasoning: inferData.reasoning,
  emailBody: htmlContent,
  subject: \"Exploring \" + (job.jobData?.jobTitle || job.jobTitle || \"Opportunities\") + \" at \" + (job.jobData?.companyName || job.companyName || \"Your Company\")
};"'::jsonb
)
WHERE "id" = 'ie6c5k1bnoqz7uz9fottieje'
  AND "workflowId" = 'cmnck57950003jcjer5mbvwfs'
  AND "type" = 'CODE';

-- Verify the update
SELECT id, type, "data"->>'code' as code_snippet
FROM "WorkflowNode"
WHERE "id" = 'ie6c5k1bnoqz7uz9fottieje'
  AND "workflowId" = 'cmnck57950003jcjer5mbvwfs';
tre