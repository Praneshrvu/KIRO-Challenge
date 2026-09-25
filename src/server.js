/**
 * Meeting Decision and Action Tracker — Express API Server
 * Accepts meeting transcripts and returns structured summaries via AWS Bedrock.
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { extractMeetingData } = require("./bedrockClient");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "2mb" }));        // Transcripts can be large
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

// In-memory store for processed meetings (replace with a DB for production)
const meetingStore = new Map();

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/analyze
 * Body: { transcript: string, title?: string }
 * Sends transcript to Bedrock/Claude and returns structured meeting data.
 */
app.post("/api/analyze", async (req, res) => {
  const { transcript, title } = req.body;

  if (!transcript || typeof transcript !== "string") {
    return res.status(400).json({
      success: false,
      error: "Missing or invalid 'transcript' field in request body.",
    });
  }

  const meetingId = uuidv4();
  const startTime = Date.now();

  console.log(`[${new Date().toISOString()}] Analyzing transcript — ID: ${meetingId}, length: ${transcript.length} chars`);

  try {
    const extracted = await extractMeetingData(transcript);

    const result = {
      id: meetingId,
      title: title || `Meeting — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
      processedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime,
      ...extracted,
    };

    // Cache result
    meetingStore.set(meetingId, result);

    console.log(`[${new Date().toISOString()}] Extraction complete — ${result.decisions?.length ?? 0} decisions, ${result.actionItems?.length ?? 0} action items`);

    res.json({ success: true, data: result });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Extraction error:`, err.message);
    res.status(500).json({
      success: false,
      error: err.message || "An unexpected error occurred during analysis.",
    });
  }
});

/**
 * GET /api/meetings
 * Returns all processed meetings (most recent first).
 */
app.get("/api/meetings", (req, res) => {
  const meetings = Array.from(meetingStore.values())
    .sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt))
    .map(({ id, title, processedAt, summary, decisions, actionItems }) => ({
      id,
      title,
      processedAt,
      summary,
      decisionCount: decisions?.length ?? 0,
      actionItemCount: actionItems?.length ?? 0,
    }));

  res.json({ success: true, data: meetings });
});

/**
 * GET /api/meetings/:id
 * Returns full detail for a specific meeting.
 */
app.get("/api/meetings/:id", (req, res) => {
  const meeting = meetingStore.get(req.params.id);
  if (!meeting) {
    return res.status(404).json({ success: false, error: "Meeting not found." });
  }
  res.json({ success: true, data: meeting });
});

/**
 * DELETE /api/meetings/:id
 * Removes a meeting from the store.
 */
app.delete("/api/meetings/:id", (req, res) => {
  const existed = meetingStore.delete(req.params.id);
  if (!existed) {
    return res.status(404).json({ success: false, error: "Meeting not found." });
  }
  res.json({ success: true, message: "Meeting deleted." });
});

/**
 * GET /api/health
 * Simple health check endpoint.
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    provider: "Groq (free)",
  });
});

// Serve frontend for all other routes (SPA fallback)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Meeting Tracker running at http://localhost:${PORT}`);
  console.log(`   Provider : Groq (free)`);
  console.log(`   Model    : ${process.env.GROQ_MODEL || "llama-3.3-70b-versatile"}`);
  console.log(`   Press Ctrl+C to stop\n`);
});

module.exports = app;
