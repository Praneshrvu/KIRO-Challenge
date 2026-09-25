/**
 * AWS Bedrock client for Claude-powered transcript analysis.
 * Handles all communication with the Bedrock Runtime API.
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
require("dotenv").config();

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  // Credentials are picked up from env vars, ~/.aws/credentials, or IAM role automatically
});

const MODEL_ID = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-sonnet-20240229-v1:0";

/**
 * Builds the structured extraction prompt for a meeting transcript.
 * @param {string} transcript - Raw meeting transcript text
 * @returns {string} Formatted prompt
 */
function buildExtractionPrompt(transcript) {
  return `You are an expert meeting analyst. Analyze the following meeting transcript and extract:

1. **Decisions Made** - Clear decisions that were agreed upon during the meeting
2. **Action Items** - Specific tasks that need to be completed
3. **Owners** - The person(s) responsible for each action item
4. **Deadlines** - Due dates or timeframes mentioned for action items
5. **Meeting Summary** - A concise 2-3 sentence summary of what the meeting was about

Return your response as a valid JSON object with this exact structure:
{
  "summary": "Brief overview of the meeting purpose and outcomes",
  "decisions": [
    {
      "id": "D1",
      "description": "The decision that was made",
      "context": "Brief context or rationale"
    }
  ],
  "actionItems": [
    {
      "id": "A1",
      "task": "Specific task to be completed",
      "owner": "Person responsible (use 'Unassigned' if not mentioned)",
      "deadline": "Due date or timeframe (use 'Not specified' if not mentioned)",
      "priority": "High|Medium|Low",
      "relatedDecision": "D1 or null if standalone"
    }
  ],
  "participants": ["Name1", "Name2"],
  "meetingDate": "Date if mentioned, otherwise null",
  "followUpRequired": true or false
}

Important rules:
- Extract only what is explicitly stated or clearly implied in the transcript
- Do not invent owners or deadlines not mentioned in the transcript
- Mark priority as High if urgent language is used, Medium for normal tasks, Low for nice-to-haves
- Return ONLY the JSON object, no additional text

MEETING TRANSCRIPT:
---
${transcript}
---`;
}

/**
 * Sends a transcript to Claude via Bedrock and returns structured extraction results.
 * @param {string} transcript - Raw meeting transcript
 * @returns {Promise<Object>} Structured meeting data
 */
async function extractMeetingData(transcript) {
  if (!transcript || transcript.trim().length < 50) {
    throw new Error("Transcript is too short to extract meaningful data. Please provide a more detailed transcript.");
  }

  const prompt = buildExtractionPrompt(transcript);

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.1, // Low temperature for consistent, factual extraction
  };

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  try {
    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const rawText = responseBody.content[0].text;

    // Parse the JSON response from Claude
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Model did not return a valid JSON structure.");
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return extracted;
  } catch (err) {
    if (err.name === "AccessDeniedException") {
      throw new Error("AWS access denied. Check your credentials and ensure Bedrock model access is enabled in the AWS console.");
    }
    if (err.name === "ValidationException") {
      throw new Error("Invalid request to Bedrock. The transcript may be too long — try a shorter excerpt.");
    }
    throw err;
  }
}

module.exports = { extractMeetingData };
