const API_URL = "https://clausebuddy.onrender.com/analyze";

let savedLegalText = "";
let isLoading = false;
let lastScan = null;

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "GET_PAGE_TEXT" }, (response) => {
      const summaryEl = document.getElementById("summary-text");

      if (chrome.runtime.lastError || !response || !response.success) {
        summaryEl.innerText = "This page cannot be analyzed.";
        summaryEl.style.color = "#ff4d4d";
        return;
      }

      // KEEP FULL TEXT for local scan
      savedLegalText = response.text;

      analyzeText(savedLegalText);
    });
  });
});

/* ================= FETCH WITH RETRY ================= */
async function fetchWithRetry(payload, retries = 2) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.status === 503 && retries > 0) {
      await new Promise(r => setTimeout(r, 3000));
      return fetchWithRetry(payload, retries - 1);
    }
    return res;
  } catch {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 3000));
      return fetchWithRetry(payload, retries - 1);
    }
    throw new Error("Network");
  }
}

/* ================= ANALYZE ================= */
async function analyzeText(text) {
  const summaryEl = document.getElementById("summary-text");
  if (isLoading) return;

  isLoading = true;
  summaryEl.innerText = "Analyzing...";
  summaryEl.style.color = "";

  try {
    // Only send small slice to AI
    const res = await fetchWithRetry({ legal_text: text.slice(0, 1200) });
    const raw = await res.text();
    if (!res.ok) throw new Error(raw);

    const data = JSON.parse(raw);
    lastScan = data;
    renderResult(data);

  } catch {
    const scan = localScan(text);
    lastScan = scan;
    renderResult(scan);
  } finally {
    isLoading = false;
  }
}

/* ================= LOCAL FALLBACK ================= */
function findSnippets(text, keywords) {
  const sentences = text.split(/[.!?]\s/);
  const hits = [];
  for (const s of sentences) {
    for (const k of keywords) {
      if (s.toLowerCase().includes(k)) {
        hits.push(s.trim());
        break;
      }
    }
  }
  return hits.slice(0, 8); // more coverage now
}

function localScan(text) {
  const redKeys = ["sell", "share", "third party", "no liability", "terminate"];
  const yellowKeys = ["cookies", "tracking", "analytics", "retain", "automatically"];
  const greenKeys = ["do not sell", "opt out", "privacy", "user rights", "data protection"];

  const redHits = findSnippets(text, redKeys);
  const yellowHits = findSnippets(text, yellowKeys);
  const greenHits = findSnippets(text, greenKeys);

  return {
    summary: "Showing instant legal risk scan (AI warming up).",
    critical: redHits.length,
    concerns: yellowHits.length,
    safe: greenHits.length,
    redHits,
    yellowHits,
    greenHits
  };
}

/* ================= RENDER ================= */
function renderResult(data) {
  lastScan = data;

  const all = [
    ...(data.redHits || []).map(t => "🔴 " + t),
    ...(data.yellowHits || []).map(t => "🟡 " + t),
    ...(data.greenHits || []).map(t => "🟢 " + t)
  ];

  document.getElementById("summary-text").innerText =
    data.summary + "\n\nExtracted from this page:\n\n" + all.join("\n\n");

  document.getElementById("red-count").innerText = `${data.critical} Critical`;
  document.getElementById("yellow-count").innerText = `${data.concerns} Concerns`;
  document.getElementById("green-count").innerText = `${data.safe} Safe`;

  updateScore(data.critical, data.concerns, data.safe);
}

/* ================= SCORE ================= */
function updateScore(c, y, g) {
  const total = c + y + g;
  if (!total) return;

  const score = Math.round(((g * 2 + y) / (total * 2)) * 100);

  document.getElementById("score-val").innerText = score;
  document.getElementById("score-fill").setAttribute("stroke-dasharray", `${score},100`);

  let rating = "Poor";
  if (score >= 80) rating = "Excellent";
  else if (score >= 60) rating = "Good";
  else if (score >= 40) rating = "Fair";

  document.getElementById("score-rating").innerText = rating;
}

/* ================= CHAT (DEMO SAFE) ================= */
const chatContainer = document.getElementById("chat-container");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

sendBtn.addEventListener("click", sendMessage);
chatInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const q = chatInput.value.trim();
  if (!q || isLoading) return;

  appendMsg(q, "user");
  chatInput.value = "";

  appendMsg("Yes. Let me check this document…", "ai");
  isLoading = true;

  setTimeout(() => {
    if (lastScan) {
      const evidence = [
        ...(lastScan.redHits || []),
        ...(lastScan.yellowHits || []),
        ...(lastScan.greenHits || [])
      ];

      const reply =
        "Yes. Based on this page:\n\n" +
        (evidence.length
          ? "• " + evidence[0]
          : "• This document contains user-impacting legal clauses.");

      replaceLast(reply);
    } else {
      replaceLast("Yes. This page contains legal and privacy clauses.");
    }

    isLoading = false;
  }, 600);
}

/* ================= CHAT UI ================= */
function appendMsg(text, cls) {
  const d = document.createElement("div");
  d.className = cls + "-msg";
  d.innerText = text;
  chatContainer.appendChild(d);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function replaceLast(text) {
  const msgs = chatContainer.querySelectorAll(".ai-msg");
  msgs[msgs.length - 1].innerText = text;
}
