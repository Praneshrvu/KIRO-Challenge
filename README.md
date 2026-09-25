# 📋 Meeting Decision & Action Tracker

An AI-powered web app that transforms raw meeting transcripts into structured summaries — extracting decisions, action items, owners, and deadlines using the **Groq** free LLM API. No AWS account needed.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 AI Extraction | Groq (Llama / Qwen) parses transcripts automatically |
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
- A free **Groq API key** — sign up at [console.groq.com](https://console.groq.com) (takes 30 seconds, no credit card)

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
# Copy the example and fill in your values
cp .env.example .env
```

Edit `.env`:

```env
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=qwen/qwen3.8-27b
PORT=3000
```

> Get your key at [console.groq.com](https://console.groq.com) → **API Keys** → **Create API key**

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

### `transcript-save-notify.json` — PostFileSave
**Trigger:** When a transcript file in `samples/` is saved
**Action:** Reminds you to re-analyze the updated transcript

---

## 📁 Project Structure

```
.
├── src/
│   ├── server.js          # Express API server
│   └── bedrockClient.js   # Groq AI integration
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
    "title": "Project Planning Meeting",
    "summary": "The team agreed to complete the frontend...",
    "decisions": [
      { "id": "D1", "description": "...", "context": "..." }
    ],
    "actionItems": [
      {
        "id": "A1", "task": "Finish the login page",
        "owner": "Rahul", "deadline": "Friday",
        "priority": "Medium", "relatedDecision": "D1"
      }
    ],
    "participants": ["Sarah", "Rahul", "Priya"],
    "meetingDate": null,
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

**Change the model** — update `GROQ_MODEL` in `.env`. Run `GET https://api.groq.com/openai/v1/models` with your key to see what's available on your account.

**Persist meetings across restarts** — replace the in-memory `Map` in `server.js` with a database (SQLite, Postgres, etc.)

---

## 🛠️ Troubleshooting

| Error | Fix |
|---|---|
| `The security token included in the request is invalid` | Old AWS error — make sure you're on the Groq version and restarted the server |
| `GROQ_API_KEY is not set` | Add your key to `.env` and restart |
| `model_not_found` | The model name changed; pick one from the models list and update `GROQ_MODEL` |
| `Cannot reach server` (red dot) | Run `npm start` and refresh |
| `Transcript too short` | Provide at least 50 characters of content |

---

## 📄 License

MIT
