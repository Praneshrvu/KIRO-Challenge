/**
 * AI client for meeting transcript analysis.
 * Uses Groq (free tier) with llama-3.3-70b — no AWS account needed.
 * Get a free API key at https://console.groq.com
 */

const Groq = require("groq-sdk");
require("dotenv").config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

/**
 * Builds the structured extraction prompt for a meeting transcript.
 */
function buildExtractionPrompt(transcript) {
  return `You are an expert meeting analyst. Analyze the following meeting transcript and extract key information.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation, just the JSON):
{
  "summary": "Brief 2-3 sentence overview of the meeting",
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
      "owner": "Person responsible (use Unassigned if not mentioned)",
      "deadline": "Due date or timeframe (use Not specified if not mentioned)",
      "priority": "High or Medium or Low",
      "relatedDecision": "D1 or null"
    }
  ],
  "participants": ["Name1", "Name2"],
  "meetingDate": "Date if mentioned or null",
  "followUpRequired": true
}

Rules:
- priority is High if urgent language is used, Medium for normal tasks, Low for nice-to-haves
- Extract only what is in the transcript — do not invent details
- Return ONLY the JSON object, nothing else

MEETING TRANSCRIPT:
---
${transcript}
---`;
}

/**
 * Sends a transcript to Groq and returns structured meeting data.
 */
async function extractMeetingData(transcript) {
  if (!transcript || transcript.trim().length < 50) {
    throw new Error("Transcript is too short. Please provide more content.");
  }

  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set. Add it to your .env file. Get a free key at https://console.groq.com");
  }

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "user",
        content: buildExtractionPrompt(transcript),
      },
    ],
    temperature: 0.1,
    max_tokens: 4096,
  });

  const rawText = completion.choices[0]?.message?.content || "";

  // Extract JSON from the response
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Model did not return a valid JSON structure. Try again.");
  }

  return JSON.parse(jsonMatch[0]);
}

module.exports = { extractMeetingData };
