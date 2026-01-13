const VERCEL_URL = "https://clausebuddy-mu.vercel.app/api/analyze";
let savedLegalText = ""; 

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "text_scraped") {
        savedLegalText = message.legal_text;
        analyzeText(savedLegalText);
    }
});

async function analyzeText(text) {
    const summaryEl = document.getElementById('summary-text');
    summaryEl.innerText = "Connecting to AI...";

    try {
        const response = await fetch(VERCEL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ legal_text: text })
        });

        // FIX: Read raw text first to catch Vercel HTML errors
        const rawText = await response.text();
        
        if (!response.ok) {
            throw new Error(`Server Error ${response.status}: ${rawText.substring(0, 50)}...`);
        }

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            throw new Error("AI returned invalid data. The server might have crashed.");
        }

        if (data.error) {
            throw new Error(data.error);
        }

        // Update UI
        summaryEl.innerText = data.summary;
        document.getElementById('red-count').innerText = `${data.critical} Critical`;
        document.getElementById('yellow-count').innerText = `${data.concerns} Concerns`;
        document.getElementById('green-count').innerText = `${data.safe} Safe`;
        updateScore(data.critical, data.concerns, data.safe);

    } catch (error) {
        console.error("Full Error:", error);
        // This puts the REAL error on your screen
        summaryEl.innerText = `ERROR: ${error.message}`;
        summaryEl.style.color = "#ff4d4d";
    }
}

// ... Keep your Chat Logic and updateScore function below ...
// Make sure to update the Chat Logic fetch similarly if possible, or just fix analyzeText first.