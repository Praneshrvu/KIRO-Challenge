# 📋 Meeting Decision & Action Tracker

An AI-powered web app that transforms raw meeting transcripts into structured summaries — extracting decisions, action items, owners, and deadlines using **AWS Bedrock (Claude)**.

![Meeting Tracker Screenshot](https://via.placeholder.com/900x500/1a1d27/7c6af7?text=Meeting+Tracker+UI)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 AI Extraction | Claude 3 Sonnet via AWS Bedrock parses transcripts automatically |
| ⚖️ Decisions | Lists every decision made with context/rationale |
| ✅ Action Items | Table of tasks with owner, deadline, and priority |
| 🔴🟡🟢 Priority Filter | Filter action items by High / Medium / Low |
| 👥 Participants | Auto-detected attendees with initials avatars |
| 📋 Copy as Markdown | One-click export for Notion, Confluence, Slack |
| ⬇️ Export JSON | Full structured data download |
| 🗂️ History | Last 20 meetings stored locally in browser |
| 📂 File Upload | Drop a `.txt` or `.md` transcript file directly |
| 🪝 Kiro Hooks | Auto-processes transcripts saved to `samples/` |

---

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+
- AWS account with **Bedrock model access** enabled for Claude 3 Sonnet
  - Enable in: AWS Console → Bedrock → Model access → `anthropic.claude-3-sonnet-20240229-v1:0`

### 2. Install Dependencies

```bash
cd meeting-tracker
npm install
```

### 3. Configure Environment

```bash
# Copy the example and fill in your values
cp .env.example .env
```

Edit `.env`:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
PORT=3000
```

> **Tip:** If running on an EC2 instance or in AWS CloudShell with an IAM role attached, you can omit the key/secret — the SDK picks up the role automatically.

### 4. Start the Server

```bash
npm start
```

Open **http://localhost:3000** in your browser.

---

## 🖥️ How to Use

1. **Paste** your meeting transcript into the text area, or **Upload** a `.txt` / `.md` file
2. Optionally give the meeting a **title**
3. Click **✨ Analyze Transcript**
4. Review the structured output:
   - 📌 Summary card
   - ⚖️ Decisions list
   - ✅ Action items table (filterable by priority)
   - 👥 Participants
5. **Copy as Markdown** to paste into Notion / Confluence, or **Export JSON** for integrations
6. Past meetings are saved in **🗂️ History** (sidebar)

---

## 🪝 Kiro Agent Hooks

Two hooks are pre-configured in `.kiro/hooks/`:

### `auto-process-transcript.json` — PostFileCreate
**Trigger:** When a `.txt` or `.md` file is created inside `samples/`  
**Action:** Kiro automatically reads the transcript, calls the API, and displays the structured extraction results.

**Usage:**
1. Make sure the server is running (`npm start`)
2. Drop any `.txt` transcript into the `samples/` folder
3. Kiro detects the new file and analyzes it — no manual copy-paste needed

### `transcript-save-notify.json` — PostFileSave
**Trigger:** When a transcript file in `samples/` is saved  
**Action:** Reminds you to re-analyze the updated transcript

---

## 📁 Project Structure

```
meeting-tracker/
├── src/
│   ├── server.js          # Express API server
│   └── bedrockClient.js   # AWS Bedrock / Claude integration
├── public/
│   ├── index.html         # Single-page app
│   ├── style.css          # Dark-theme UI
│   └── app.js             # Frontend logic
├── samples/
│   └── q4-planning-meeting.txt   # Example transcript
├── .kiro/
│   └── hooks/
│       ├── auto-process-transcript.json
│       └── transcript-save-notify.json
├── .env.example
├── package.json
└── README.md
```

---

## 🔌 API Reference

### `POST /api/analyze`
Analyze a transcript.

**Request body:**
```json
{
  "transcript": "Full meeting transcript text...",
  "title": "Optional meeting title"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Q4 Planning Meeting",
    "summary": "The team agreed to push the launch...",
    "decisions": [
      { "id": "D1", "description": "...", "context": "..." }
    ],
    "actionItems": [
      {
        "id": "A1", "task": "Update project plan",
        "owner": "James", "deadline": "Oct 18",
        "priority": "High", "relatedDecision": "D1"
      }
    ],
    "participants": ["Sarah", "James", "Priya"],
    "meetingDate": "October 15, 2026",
    "followUpRequired": true
  }
}
```

### `GET /api/meetings` — List all meetings (current session)
### `GET /api/meetings/:id` — Get full meeting detail
### `DELETE /api/meetings/:id` — Remove a meeting
### `GET /api/health` — Server health check

---

## 🔧 Customization

**Change the Claude model** — update `BEDROCK_MODEL_ID` in `.env`:
```
# Claude 3.5 Sonnet (if available in your region)
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

**Persist meetings across restarts** — replace the in-memory `Map` in `server.js` with a database (DynamoDB, SQLite, etc.)

**Add email notifications** — use AWS SES to email action item owners after each analysis.

---

## 🛠️ Troubleshooting

| Error | Fix |
|---|---|
| `AccessDeniedException` | Enable model access in AWS Console → Bedrock → Model access |
| `Cannot reach server` (red dot) | Run `npm start` and refresh |
| `Transcript too short` | Provide at least 50 characters of content |
| `ValidationException` | Transcript may be too long; try splitting into sections |
| Credentials not found | Set `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in `.env`, or attach an IAM role |

---

## 📄 License

MIT
