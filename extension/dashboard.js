const STORAGE_KEY = "clausebuddy_history";
let currentLang = "en";

function getClauseHistory() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY], res => {
      resolve(res[STORAGE_KEY] || []);
    });
  });
}

function clearClauseHistory() {
  return new Promise(resolve => {
    chrome.storage.local.remove(STORAGE_KEY, resolve);
  });
}

function scoreColor(score) {
  if (score >= 70) return "score-green";
  if (score >= 40) return "score-yellow";
  return "score-red";
}

async function loadDashboard() {
  const history = await getClauseHistory();
  const list = document.getElementById("history-list");

  list.innerHTML = "";

  if (!history.length) {
    list.innerHTML = `<li class="empty">No analysis history yet.</li>`;
    updateStats([]);
    return;
  }

  history.forEach(item => {
    const li = document.createElement("li");
    li.className = "history-item";

    li.innerHTML = `
      <div class="history-top">
        <strong>${item.site}</strong>
        <span class="score-badge ${scoreColor(item.score)}">
          ${item.score}/100
        </span>
      </div>

      <div class="history-meta">
        <span>${new Date(item.timestamp).toLocaleString()}</span>
        ${item.updated ? `<span class="updated-badge">Updated</span>` : ""}
      </div>

      <div class="history-counts">
        <span class="red">${item.critical} Critical</span>
        <span class="yellow">${item.concerns} Concerns</span>
        <span class="green">${item.safe} Safe</span>
      </div>
    `;

    list.appendChild(li);
  });

  updateStats(history);
}

function updateStats(history) {
  document.getElementById("stat-sites").innerText = history.length;

  if (!history.length) {
    document.getElementById("stat-score").innerText = "–";
    document.getElementById("stat-updated").innerText = "0";
    return;
  }

  const avg =
    Math.round(
      history.reduce((a, b) => a + b.score, 0) / history.length
    );

  const updatedCount = history.filter(h => h.updated).length;

  document.getElementById("stat-score").innerText = avg;
  document.getElementById("stat-updated").innerText = updatedCount;
}

document.getElementById("clear-history").addEventListener("click", async () => {
  await clearClauseHistory();
  loadDashboard();
});

document.getElementById("lang-toggle").addEventListener("click", () => {
  currentLang = currentLang === "en" ? "hi" : "en";
  document.getElementById("lang-toggle").innerText =
    currentLang === "hi" ? "English" : "हिंदी";
  // (future: translate labels if needed)
});

document.addEventListener("DOMContentLoaded", loadDashboard);