/* =========================================================
   ClauseBuddy – Side Panel Logic (STABLE DEMO VERSION)
   AI-first with deterministic rule-based fallback
========================================================= */


const BACKEND_URL = "https://clausebuddy.onrender.com/analyze";
const CLAUSE_PATH = "clauses/";

/* =========================================================
   STORAGE UTILITIES (chrome.storage.local)
   ========================================================= */

const STORAGE_KEY = "clausebuddy_history";

// Get full history array
function getClauseHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || []);
    });
  });
}

// Save full history array
function saveClauseHistory(history) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: history }, resolve);
  });
}

// Clear all stored history
function clearClauseHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(STORAGE_KEY, resolve);
  });
}

let rules = { red: [], yellow: [], green: [] };
let currentLang = "en";
let currentMode = "AI"; // AI | FALLBACK
let extractedText = "";
let fallbackResult = null;
let aiResult = null;

/* =========================================================
   POLICY HASHING (SHA-256)
   ========================================================= */

async function generatePolicyHash(text) {
  if (!text) return null;

  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hasPolicyChanged(oldHash, newHash) {
  if (!oldHash || !newHash) return false;
  return oldHash !== newHash;
}

/* =========================================================
   ANALYSIS PERSISTENCE
   ========================================================= */

async function persistAnalysisResult({
  url,
  site,
  score,
  critical,
  concerns,
  safe,
  policyText
}) {
  try {
    const history = await getClauseHistory();

    console.log("Existing history Before save:", history);

    const newHash = await generatePolicyHash(policyText);

    const existingIndex = history.findIndex(item => item.url === url);

    const entry = {
      url,
      site,
      score,
      critical,
      concerns,
      safe,
      timestamp: new Date().toISOString(),
      hash: newHash,
      updated: false
    };

    if (existingIndex !== -1) {
      const oldEntry = history[existingIndex];
      entry.updated = hasPolicyChanged(oldEntry.hash, newHash);
      history[existingIndex] = entry;
    } else {
      history.unshift(entry);
    }

    // Keep history small and fast
    await saveClauseHistory(history.slice(0, 25));

    console.log("STEP 5 Verified: Analysis persisted", entry);

  } catch (err) {
    console.error("Failed to persist analysis:", err);
  }
}

/* ======================= INIT ======================= */

document.addEventListener("DOMContentLoaded", async () => {
  await loadClauseLibraries();
  bindChatEvents();
});

/* ======================= LOAD CLAUSE JSON ======================= */

async function loadClauseLibraries() {
  try {
    const [r, y, g] = await Promise.all([
      fetch(chrome.runtime.getURL(CLAUSE_PATH + "red_clauses.json")).then(r => r.json()),
      fetch(chrome.runtime.getURL(CLAUSE_PATH + "yellow_clauses.json")).then(r => r.json()),
      fetch(chrome.runtime.getURL(CLAUSE_PATH + "green_clauses.json")).then(r => r.json())
    ]);

    rules.red = r;
    rules.yellow = y;
    rules.green = g;

    console.log("Clause libraries loaded");
  } catch (e) {
    console.error("Failed to load clause libraries", e);
  }
}

/* ======================= MESSAGE FROM POPUP ======================= */

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "text_scraped") {
    extractedText = msg.legal_text || "";
    analyzedPageURL = msg.page_url || "";
    analyzeDocument(extractedText);
  }
});

/* ======================= MAIN ANALYSIS ======================= */

async function analyzeDocument(text) {
  showLoading();
  aiResult = null;
  fallbackResult = null;
  currentMode = "AI";

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 12000);

    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legal_text: text }),
      signal: controller.signal
    });

    if (!res.ok) throw new Error("AI unavailable");

    const data = await res.json();
    aiResult = data;
    currentMode = "AI";
    renderAI(data);

  } catch {
    console.warn("AI unavailable → switching to fallback");
    currentMode = "FALLBACK";
    fallbackResult = runRuleScan(text);
    renderFallback(fallbackResult);
  }
}

/* ======================= RULE ENGINE ======================= */

function runRuleScan(text) {
  const normalized = text.toLowerCase();
  const found = new Set();
  const result = { red: [], yellow: [], green: [] };

  function scan(list, target) {
    list.forEach(clause => {
      if (found.has(clause.id)) return;

      const matched = clause.patterns.some(p => {
        try {
          return new RegExp(p, "i").test(normalized);
        } catch {
          return false;
        }
      });

      if (matched) {
        found.add(clause.id);
        target.push(clause);
      }
    });
  }

  scan(rules.red, result.red);
  scan(rules.yellow, result.yellow);
  scan(rules.green, result.green);

  return result;
}

/* ======================= RENDER AI ======================= */

function renderAI(data) {
  const summary =
    currentLang === "hi" && data.summary_hi
      ? data.summary_hi
      : data.summary;

  document.getElementById("summary-text").innerHTML = `
    <div class="mode-badge ai">AI Analysis Active</div>
    <p>${summary}</p>
  `;

  updateCounts(data.critical, data.concerns, data.safe);
  updateScore(calcScore(data.critical, data.concerns));

  persistAnalysisResult({
  url: analyzedPageURL,
  site: new URL(analyzedPageURL).hostname.replace("www.", ""),
  score: scoreValue,                 // use your computed score
  critical: redCount,
  concerns: yellowCount,
  safe: greenCount,
  policyText: extractedText          // IMPORTANT
});
}


/* ======================= RENDER FALLBACK ======================= */

function renderFallback(data) {
  const summary = buildFallbackSummary(data);

  let html = `
    <div class="mode-badge fallback">
      Summary Generated
    </div>
    <p>${summary}</p>
  `;

  html += renderSection("Critical", data.red, "red");
  html += renderSection("Concerns", data.yellow, "yellow");
  html += renderSection("Safe", data.green, "green");

  document.getElementById("summary-text").innerHTML = html;

  // ✅ DEFINE COUNTS FIRST
  const redCount = data.red.length;
  const yellowCount = data.yellow.length;
  const greenCount = data.green.length;

  // ✅ DEFINE SCORE VALUE (THIS WAS MISSING)
  const scoreValue = calcScore(redCount, yellowCount);

  // ✅ NOW USE THEM
  updateCounts(redCount, yellowCount, greenCount);
  updateScore(scoreValue);

  // ✅ NOW PERSIST (FINAL STEP)
  persistAnalysisResult({
    url: analyzedPageURL,
    site: new URL(analyzedPageURL).hostname.replace("www.", ""),
    score: scoreValue,
    critical: redCount,
    concerns: yellowCount,
    safe: greenCount,
    policyText: extractedText
  });
}

/* ======================= CLAUSE-AWARE SUMMARY ======================= */

function buildFallbackSummary(data) {
  const isHi = currentLang === "hi";
  let parts = [];

  const redIds = data.red.map(c => c.id);

  if (redIds.some(id => id.includes("arbitration") || id.includes("class"))) {
    parts.push(
      isHi
        ? "इस नीति में मध्यस्थता और सामूहिक मुकदमों से जुड़े प्रतिबंध शामिल हैं, जिससे आपके कानूनी अधिकार सीमित हो सकते हैं।"
        : "This policy includes arbitration and class-action restrictions, limiting your ability to take legal action."
    );
  }

  if (redIds.some(id => id.includes("liability"))) {
    parts.push(
      isHi
        ? "कंपनी अपनी कानूनी जिम्मेदारी को सीमित करने का प्रयास करती है।"
        : "The company attempts to limit its legal responsibility for damages."
    );
  }

  if (data.yellow.length > 0) {
    parts.push(
      isHi
        ? "डेटा संग्रह, ट्रैकिंग और अंतरराष्ट्रीय स्थानांतरण को लेकर सावधानी आवश्यक है।"
        : "Caution is required regarding data collection, tracking, and international transfers."
    );
  }

  if (data.green.length > 0) {
    parts.push(
      isHi
        ? "कुछ प्रावधान उपयोगकर्ताओं को अपने डेटा पर अधिकार और नियंत्रण प्रदान करते हैं।"
        : "Some provisions grant users rights and control over their personal data."
    );
  }

  if (!parts.length) {
    return isHi
      ? "इस दस्तावेज़ में कोई प्रमुख कानूनी जोखिम नहीं पाया गया।"
      : "No major legal risks were detected in this document.";
  }

  return parts.join(" ");
}

/* ======================= RENDER SECTIONS ======================= */

function renderSection(title, list, color) {
  if (!list.length) return "";

  return `
    <h4 class="section-title ${color}">
      ${title} (${list.length})
    </h4>
    <ul class="clause-list">
      ${list
        .map(
          c =>
            `<li>${currentLang === "hi" ? c.explanation_hi : c.explanation_en}</li>`
        )
        .join("")}
    </ul>
  `;
}

/* ======================= COUNTS ======================= */

function updateCounts(r, y, g) {
  document.getElementById("red-count").innerText = `${r} Critical`;
  document.getElementById("yellow-count").innerText = `${y} Concerns`;
  document.getElementById("green-count").innerText = `${g} Safe`;
}

/* ======================= SCORE (FIXED) ======================= */

function calcScore(red, yellow = 0) {
  return Math.max(0, 100 - red * 20 - yellow * 8);
}

function updateScore(score) {
  const scoreVal = document.getElementById("score-val");
  const scoreCircle = document.getElementById("score-fill");
  const scoreLabel = document.getElementById("score-rating");

  scoreVal.innerText = score;

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(100, Math.max(0, score));
  const offset = circumference - (percent / 100) * circumference;

  scoreCircle.style.strokeDasharray = circumference;
  scoreCircle.style.strokeDashoffset = offset;

  if (score > 70) scoreLabel.innerText = "Safe";
  else if (score > 40) scoreLabel.innerText = "Moderate";
  else scoreLabel.innerText = "High Risk";
}

/* ======================= CHAT ======================= */

function bindChatEvents() {
  const input = document.getElementById("chat-input");
  const send = document.getElementById("send-btn");

  send.addEventListener("click", sendChat);
  input.addEventListener("keypress", e => {
    if (e.key === "Enter") sendChat();
  });
}

function sendChat() {
  const input = document.getElementById("chat-input");
  const question = input.value.trim();
  if (!question) return;

  addChat(question, "user");
  input.value = "";

  respondRuleBased(question);
}

function respondRuleBased(question) {
  if (!fallbackResult) {
    addChat(
      currentLang === "hi"
        ? "कृपया पहले दस्तावेज़ का विश्लेषण करें।"
        : "Please analyze the document first.",
      "ai"
    );
    return;
  }

  const q = question.toLowerCase();
  const allClauses = [
    ...fallbackResult.red,
    ...fallbackResult.yellow,
    ...fallbackResult.green
  ];

  const hit = allClauses.find(c =>
    q.split(" ").some(w => w.length > 3 && c.explanation_en.toLowerCase().includes(w))
  );

  if (hit) {
    addChat(
      currentLang === "hi" ? hit.explanation_hi : hit.explanation_en,
      "ai"
    );
  } else {
    addChat(
      currentLang === "hi"
        ? "इस प्रश्न के लिए नियम-आधारित विश्लेषण में कुछ नहीं मिला।"
        : "No directly related clause was found. Deeper AI analysis would be required.",
      "ai"
    );
  }
}

/* ======================= CHAT UI ======================= */

function addChat(text, sender) {
  const box = document.getElementById("chat-container");
  const div = document.createElement("div");
  div.className = sender === "user" ? "user-msg" : "ai-msg";
  div.innerText = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

/* ======================= LOADING ======================= */

function showLoading() {
  document.getElementById("summary-text").innerHTML =
    "<p>Analyzing document…</p>";
}

/* ======================= LANGUAGE TOGGLE ======================= */

document.querySelector(".cb-translate-btn")?.addEventListener("click", () => {
  currentLang = currentLang === "en" ? "hi" : "en";
  if (currentMode === "FALLBACK" && fallbackResult) renderFallback(fallbackResult);
  if (currentMode === "AI" && aiResult) renderAI(aiResult);
});

document.getElementById("open-dashboard")?.addEventListener("click", () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("dashboard.html")
  });
});