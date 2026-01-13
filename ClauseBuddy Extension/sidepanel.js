const VERCEL_URL = "https://clausebuddy-mu.vercel.app/api/analyze";
let savedLegalText = ""; // FIX: Store the legal text here so the chat has context

// 1. Listen for Scraped Text from content.js
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "text_scraped") {
        savedLegalText = message.legal_text; // Save context for the chat logic
        analyzeText(savedLegalText);
    }
});

// 2. Initial Analysis (Runs when the page is first scanned)
async function analyzeText(text) {
    const summaryEl = document.getElementById('summary-text');
    try {
        const response = await fetch(VERCEL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ legal_text: text })
        });
        
        const data = await response.json();

        // Update Summary and Bento Cards
        summaryEl.innerText = data.summary;
        document.getElementById('red-count').innerText = `${data.critical} Critical Risks`;
        document.getElementById('yellow-count').innerText = `${data.concerns} Review Items`;
        document.getElementById('green-count').innerText = `${data.safe} Safe Clauses`;

        // Update the Circular Privacy Score
        updateScore(data.critical, data.concerns, data.safe);

    } catch (error) {
        console.error("Analysis Error:", error);
        summaryEl.innerText = "Error connecting to AI. Please ensure your Vercel backend is live.";
    }
}

// 3. TWO-WAY CHAT LOGIC
document.getElementById('send-btn').addEventListener('click', async () => {
    const input = document.getElementById('chat-input');
    const container = document.getElementById('chat-container');
    const question = input.value.trim();
    
    if (!question) return;

    // Append User Message to UI
    const userDiv = document.createElement('div');
    userDiv.style.cssText = "background: #10b981; color: black; padding: 10px; border-radius: 12px; margin: 10px 0 10px auto; width: fit-content; max-width: 80%; font-weight: bold; font-size: 0.85rem;";
    userDiv.innerText = question;
    container.appendChild(userDiv);
    
    input.value = ""; // Clear input
    container.scrollTop = container.scrollHeight; // Auto-scroll

    // Fetch AI Response
    try {
        const response = await fetch(VERCEL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                question: question, 
                legal_text: savedLegalText // FIX: Use the saved document text, not the sidepanel UI text
            })
        });
        
        const data = await response.json();
        
        // Append AI Response to UI
        const aiDiv = document.createElement('div');
        aiDiv.className = "ai-msg"; // Uses your existing CSS for AI messages
        aiDiv.innerText = data.answer || "I couldn't process that. Please try again.";
        container.appendChild(aiDiv);
        
        container.scrollTop = container.scrollHeight;
    } catch (e) {
        console.error("Chat error:", e);
    }
});

// 4. Privacy Score Animation Logic
function updateScore(critical, concerns, safe) {
    const scoreValEl = document.getElementById('score-val');
    const fill = document.getElementById('score-fill');
    
    // Logic: Start at 100, subtract points based on risks
    let score = 100 - (critical * 20) - (concerns * 5);
    score = Math.max(0, score); // Don't go below 0

    scoreValEl.innerText = score;
    
    // Update SVG Circle (stroke-dasharray="score, 100")
    fill.setAttribute('stroke-dasharray', `${score}, 100`);
    
    // Update the Rating Label
    const rating = document.getElementById('score-rating');
    if (score > 80) rating.innerText = "Safe";
    else if (score > 50) rating.innerText = "Moderate Risk";
    else rating.innerText = "High Danger";
}