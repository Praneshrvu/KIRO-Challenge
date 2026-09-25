/**
 * Meeting Decision & Action Tracker — Frontend Application
 * Handles transcript submission, result rendering, filtering, and history.
 */

// ── State ─────────────────────────────────────────────────────────────────────
let currentMeeting = null;
let meetingHistory = JSON.parse(localStorage.getItem("meetingHistory") || "[]");
let activeFilter = "all";

// ── DOM refs ──────────────────────────────────────────────────────────────────
const transcriptInput  = document.getElementById("transcriptInput");
const meetingTitle     = document.getElementById("meetingTitle");
const analyzeBtn       = document.getElementById("analyzeBtn");
const btnText          = analyzeBtn.querySelector(".btn-text");
const btnSpinner       = analyzeBtn.querySelector(".btn-spinner");
const charCount        = document.getElementById("charCount");
const resultsSection   = document.getElementById("resultsSection");
const errorBanner      = document.getElementById("errorBanner");
const errorMessage     = document.getElementById("errorMessage");
const statusDot        = document.getElementById("statusDot");
const historyCount     = document.getElementById("historyCount");
const sidebar          = document.getElementById("sidebar");
const historyList      = document.getElementById("historyList");

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  checkHealth();
  renderHistory();
  bindEvents();
});

// ── Health check ──────────────────────────────────────────────────────────────
async function checkHealth() {
  try {
    const res = await fetch("/api/health");
    statusDot.className = res.ok ? "status-dot ok" : "status-dot error";
    statusDot.title = res.ok ? "Server online" : "Server error";
  } catch {
    statusDot.className = "status-dot error";
    statusDot.title = "Cannot reach server";
  }
}

// ── Event Bindings ────────────────────────────────────────────────────────────
function bindEvents() {
  // Character counter
  transcriptInput.addEventListener("input", () => {
    const n = transcriptInput.value.length;
    charCount.textContent = `${n.toLocaleString()} character${n !== 1 ? "s" : ""}`;
  });

  // Analyze button
  analyzeBtn.addEventListener("click", handleAnalyze);

  // Clear button
  document.getElementById("clearBtn").addEventListener("click", () => {
    transcriptInput.value = "";
    meetingTitle.value = "";
    charCount.textContent = "0 characters";
    hideError();
    resultsSection.classList.add("hidden");
  });

  // Load sample transcript
  document.getElementById("loadSample").addEventListener("click", loadSampleTranscript);

  // File upload
  document.getElementById("fileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      transcriptInput.value = ev.target.result;
      transcriptInput.dispatchEvent(new Event("input"));
      showToast(`📂 Loaded: ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // Copy as Markdown
  document.getElementById("copyBtn").addEventListener("click", copyAsMarkdown);

  // Download JSON
  document.getElementById("downloadBtn").addEventListener("click", downloadJSON);

  // Error dismiss
  document.getElementById("dismissError").addEventListener("click", hideError);

  // Sidebar toggle
  document.getElementById("historyToggle").addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    sidebar.classList.toggle("open"); // for mobile
  });
  document.getElementById("closeSidebar").addEventListener("click", () => {
    sidebar.classList.add("collapsed");
    sidebar.classList.remove("open");
  });

  // Priority filter buttons
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      applyFilter();
    });
  });
}

// ── Analyze ───────────────────────────────────────────────────────────────────
async function handleAnalyze() {
  const transcript = transcriptInput.value.trim();
  if (!transcript) {
    showError("Please paste a meeting transcript before analyzing.");
    return;
  }
  if (transcript.length < 50) {
    showError("The transcript is too short. Please provide more content.");
    return;
  }

  setLoading(true);
  hideError();

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        title: meetingTitle.value.trim() || undefined,
      }),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.error || "Server returned an unexpected error.");
    }

    currentMeeting = json.data;
    renderResults(currentMeeting);
    saveMeetingToHistory(currentMeeting);
    resultsSection.classList.remove("hidden");
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

// ── Render Results ────────────────────────────────────────────────────────────
function renderResults(data) {
  // Header
  document.getElementById("resultTitle").textContent = data.title;
  const dateStr = data.meetingDate
    ? `Meeting date: ${data.meetingDate}  ·  `
    : "";
  document.getElementById("resultMeta").textContent =
    `${dateStr}Analyzed ${new Date(data.processedAt).toLocaleString()}  ·  ${data.processingTimeMs}ms`;

  // Summary
  document.getElementById("summaryText").textContent = data.summary || "No summary available.";

  const chipsEl = document.getElementById("summaryChips");
  chipsEl.innerHTML = "";
  if (data.meetingDate) addChip(chipsEl, `📅 ${data.meetingDate}`);
  if (data.participants?.length) addChip(chipsEl, `👥 ${data.participants.length} participants`);
  if (data.followUpRequired) addChip(chipsEl, "🔔 Follow-up required", "follow-up");

  // Stats
  const statsRow = document.getElementById("statsRow");
  statsRow.innerHTML = [
    { value: data.decisions?.length ?? 0,   label: "Decisions" },
    { value: data.actionItems?.length ?? 0, label: "Action Items" },
    { value: (data.actionItems || []).filter(a => a.priority === "High").length, label: "High Priority" },
    { value: (data.actionItems || []).filter(a => a.owner && a.owner !== "Unassigned").length, label: "Assigned" },
  ].map(s => `
    <div class="stat-card">
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>`).join("");

  // Decisions
  const decEl = document.getElementById("decisionsList");
  const decisions = data.decisions || [];
  document.getElementById("decisionsCount").textContent = decisions.length;
  if (decisions.length === 0) {
    decEl.innerHTML = `<p class="empty-state">No explicit decisions recorded.</p>`;
  } else {
    decEl.innerHTML = decisions.map(d => `
      <div class="decision-item">
        <div class="decision-id">${d.id}</div>
        <div class="decision-text">${escHtml(d.description)}</div>
        ${d.context ? `<div class="decision-context">${escHtml(d.context)}</div>` : ""}
      </div>`).join("");
  }

  // Action Items
  const actions = data.actionItems || [];
  document.getElementById("actionsCount").textContent = actions.length;
  const tbody = document.getElementById("actionsTableBody");
  if (actions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No action items found.</td></tr>`;
  } else {
    tbody.innerHTML = actions.map((a, i) => `
      <tr data-priority="${a.priority}" data-index="${i}">
        <td>${escHtml(a.task)}</td>
        <td class="owner-cell">${escHtml(a.owner || "Unassigned")}</td>
        <td class="deadline-cell">${escHtml(a.deadline || "Not specified")}</td>
        <td><span class="priority-badge priority-${a.priority}">${a.priority}</span></td>
        <td>
          <button class="status-toggle" onclick="toggleDone(this)">⬜ To Do</button>
        </td>
      </tr>`).join("");
  }

  // Participants
  const parts = data.participants || [];
  const partsEl = document.getElementById("participantsList");
  if (parts.length === 0) {
    partsEl.innerHTML = `<p class="empty-state">No participants identified.</p>`;
  } else {
    partsEl.innerHTML = parts.map(p => `
      <div class="participant-chip">
        <div class="avatar">${p.charAt(0).toUpperCase()}</div>
        ${escHtml(p)}
      </div>`).join("");
  }

  // Reset filter
  activeFilter = "all";
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  document.querySelector('[data-filter="all"]').classList.add("active");
}

// ── Filter ────────────────────────────────────────────────────────────────────
function applyFilter() {
  const rows = document.querySelectorAll("#actionsTableBody tr[data-priority]");
  rows.forEach(row => {
    const match = activeFilter === "all" || row.dataset.priority === activeFilter;
    row.classList.toggle("hidden-row", !match);
  });
}

// ── Status toggle ─────────────────────────────────────────────────────────────
function toggleDone(btn) {
  btn.classList.toggle("done");
  btn.textContent = btn.classList.contains("done") ? "✅ Done" : "⬜ To Do";
}

// ── Copy as Markdown ──────────────────────────────────────────────────────────
function copyAsMarkdown() {
  if (!currentMeeting) return;
  const d = currentMeeting;

  const md = [
    `# ${d.title}`,
    `**Analyzed:** ${new Date(d.processedAt).toLocaleString()}`,
    d.meetingDate ? `**Meeting Date:** ${d.meetingDate}` : "",
    "",
    "## Summary",
    d.summary,
    "",
    "## Decisions",
    ...(d.decisions || []).map(dec => `- **${dec.id}:** ${dec.description}${dec.context ? ` _(${dec.context})_` : ""}`),
    "",
    "## Action Items",
    "| Task | Owner | Deadline | Priority |",
    "| ---- | ----- | -------- | -------- |",
    ...(d.actionItems || []).map(a =>
      `| ${a.task} | ${a.owner || "Unassigned"} | ${a.deadline || "Not specified"} | ${a.priority} |`
    ),
    "",
    "## Participants",
    (d.participants || []).map(p => `- ${p}`).join("\n"),
  ].filter(l => l !== undefined).join("\n");

  navigator.clipboard.writeText(md).then(() => showToast("📋 Copied as Markdown!"));
}

// ── Download JSON ─────────────────────────────────────────────────────────────
function downloadJSON() {
  if (!currentMeeting) return;
  const blob = new Blob([JSON.stringify(currentMeeting, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `meeting-${currentMeeting.id.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("⬇️ JSON downloaded!");
}

// ── History ───────────────────────────────────────────────────────────────────
function saveMeetingToHistory(meeting) {
  // Keep last 20 meetings
  meetingHistory = [
    { id: meeting.id, title: meeting.title, processedAt: meeting.processedAt,
      summary: meeting.summary, decisionCount: meeting.decisions?.length ?? 0,
      actionItemCount: meeting.actionItems?.length ?? 0 },
    ...meetingHistory.filter(m => m.id !== meeting.id),
  ].slice(0, 20);
  localStorage.setItem("meetingHistory", JSON.stringify(meetingHistory));
  renderHistory();
}

function renderHistory() {
  historyCount.textContent = meetingHistory.length;
  if (meetingHistory.length === 0) {
    historyList.innerHTML = `<p class="empty-state">No meetings analyzed yet.</p>`;
    return;
  }
  historyList.innerHTML = meetingHistory.map(m => `
    <div class="history-item ${currentMeeting?.id === m.id ? "active" : ""}"
         onclick="loadFromHistory('${m.id}')">
      <h4 title="${escHtml(m.title)}">${escHtml(m.title)}</h4>
      <p>${new Date(m.processedAt).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}</p>
      <div class="chips">
        <span class="hist-chip">⚖️ ${m.decisionCount}</span>
        <span class="hist-chip">✅ ${m.actionItemCount}</span>
      </div>
    </div>`).join("");
}

async function loadFromHistory(id) {
  // Try fetching from server first; fall back to local cache
  try {
    const res = await fetch(`/api/meetings/${id}`);
    if (res.ok) {
      const json = await res.json();
      currentMeeting = json.data;
      renderResults(currentMeeting);
      resultsSection.classList.remove("hidden");
      resultsSection.scrollIntoView({ behavior: "smooth" });
      renderHistory();
      return;
    }
  } catch { /* fall through */ }

  showToast("⚠️ Full data not available — only stored during current session.", 3500);
}

// ── Sample Transcript ─────────────────────────────────────────────────────────
function loadSampleTranscript() {
  meetingTitle.value = "Q4 Product Planning Meeting";
  transcriptInput.value = `Date: October 15, 2026
Attendees: Sarah Chen (PM), James Wright (Engineering Lead), Priya Nair (Design), Tom Okafor (Marketing), Lisa Huang (QA)

Sarah: Good morning everyone. Let's get started — we have a lot to cover for Q4. First up, the launch date discussion.

James: I've reviewed the current sprint velocity. We're not going to hit the October 31st target. The payment integration alone needs two more weeks. I'd recommend pushing to November 14th.

Sarah: That's a significant shift. Tom, how does that impact the marketing campaign?

Tom: It's tight but workable. We need the final feature list by October 22nd to finalize ad copy. But I'll need James to send me the key feature highlights by end of this week.

Sarah: Agreed. James, can you own that?

James: Yes, I'll have the feature highlights to Tom by Friday October 18th.

Sarah: Good. So the decision is: we move the launch date to November 14th. Everyone aligned?

[General agreement from the group]

Priya: Before we move on — I flagged last week that the onboarding flow has a major accessibility issue. Screen readers can't navigate the signup form. This is a blocker.

Sarah: That has to be fixed before launch. Priya, can you file the detailed ticket?

Priya: Done, it's already filed. Ticket #A-204.

James: I'll assign it to the front-end team. We'll prioritize it. Target fix: October 25th.

Sarah: Perfect. Also — I want to decide on Feature X. The sentiment analysis dashboard. Engineering, where are we?

James: It's at 60% completion. We could ship a basic version or cut it for now.

Sarah: Given timeline pressure, let's cut Feature X from the Q4 launch scope. We revisit for Q1. Tom, make sure the marketing materials don't mention it.

Tom: Understood. I'll update the deck by Monday.

Lisa: I need the staging environment credentials updated — the current ones expired two days ago. It's blocking QA on three test suites.

James: Sorry about that! I'll rotate the staging credentials this afternoon and send them to Lisa directly.

Sarah: Great. One more thing — the beta user feedback survey. Priya, can you draft it?

Priya: Sure. I'll have a draft ready by October 21st for Sarah to review.

Sarah: Perfect. Let's also schedule a follow-up sync for October 28th to review launch readiness. I'll send the invite.

Any final items?

Tom: We should confirm the press embargo date once we have the final launch date locked. I'll reach out to the PR agency next week.

Sarah: Good call. Alright, I think we're done. Thanks everyone.`;

  transcriptInput.dispatchEvent(new Event("input"));
  showToast("📄 Sample transcript loaded!");
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function setLoading(loading) {
  analyzeBtn.disabled = loading;
  btnText.classList.toggle("hidden", loading);
  btnSpinner.classList.toggle("hidden", !loading);
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.classList.remove("hidden");
}

function hideError() {
  errorBanner.classList.add("hidden");
}

function showToast(msg, duration = 2500) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add("hidden"), duration);
}

function addChip(container, text, cls = "") {
  const span = document.createElement("span");
  span.className = `chip ${cls}`.trim();
  span.textContent = text;
  container.appendChild(span);
}

function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
