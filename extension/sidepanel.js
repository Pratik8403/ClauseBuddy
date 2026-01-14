const VERCEL_URL = "https://clausebuddy.onrender.com/analyze";
let savedLegalText = ""; 
let isLoading = false;

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "text_scraped") {
        savedLegalText = message.legal_text;
        analyzeText(savedLegalText);
    }
});

// Retry logic with exponential backoff
async function fetchWithRetry(url, options, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            return response;
        } catch (error) {
            if (attempt === maxRetries - 1) throw error;
            
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Retry attempt ${attempt + 1} after ${delay}ms due to:`, error.message);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function analyzeText(text) {
    const summaryEl = document.getElementById('summary-text');
    
    if (isLoading) {
        console.log("Analysis already in progress...");
        return;
    }
    
    isLoading = true;
    summaryEl.innerText = "Connecting to AI...";
    summaryEl.style.color = "";

    try {
        summaryEl.innerText = "Analyzing document... This may take a moment.";
        
        const response = await fetchWithRetry(VERCEL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ legal_text: text })
        }, 3);

        // Read raw text first to catch HTML errors
        const rawText = await response.text();
        
        if (!response.ok) {
            if (response.status >= 500) {
                throw new Error("Backend service is temporarily unavailable. Please try again later.");
            } else if (response.status === 400) {
                throw new Error("Invalid input. Please check the document text.");
            } else {
                throw new Error(`Server Error ${response.status}: ${rawText.substring(0, 50)}...`);
            }
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
        summaryEl.style.color = "";
        document.getElementById('red-count').innerText = `${data.critical} Critical`;
        document.getElementById('yellow-count').innerText = `${data.concerns} Concerns`;
        document.getElementById('green-count').innerText = `${data.safe} Safe`;
        updateScore(data.critical, data.concerns, data.safe);

    } catch (error) {
        console.error("Full Error:", error);
        
        // Differentiate error types for better user experience
        let errorMessage = error.message;
        if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
            errorMessage = "Network error: Please check your internet connection and try again.";
        }
        
        summaryEl.innerText = `ERROR: ${errorMessage}`;
        summaryEl.style.color = "#ff4d4d";
    } finally {
        isLoading = false;
    }
}

function updateScore(critical, concerns, safe) {
    const total = critical + concerns + safe;
    if (total === 0) return;
    
    const score = Math.round(((safe * 2 + concerns) / (total * 2)) * 100);
    
    document.getElementById('score-val').innerText = score;
    document.getElementById('score-fill').setAttribute('stroke-dasharray', `${score}, 100`);
    
    let rating = "Poor";
    if (score >= 80) rating = "Excellent";
    else if (score >= 60) rating = "Good";
    else if (score >= 40) rating = "Fair";
    
    document.getElementById('score-rating').innerText = rating;
}

// Chat functionality
const chatContainer = document.getElementById('chat-container');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    const question = chatInput.value.trim();
    if (!question || !savedLegalText) return;
    
    if (isLoading) {
        console.log("Please wait for current request to complete...");
        return;
    }
    
    // Add user message
    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'user-msg';
    userMsgEl.innerText = question;
    chatContainer.appendChild(userMsgEl);
    chatInput.value = '';
    
    // Add loading indicator
    const loadingEl = document.createElement('div');
    loadingEl.className = 'ai-msg';
    loadingEl.innerText = 'Thinking...';
    chatContainer.appendChild(loadingEl);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    isLoading = true;
    
    try {
        const response = await fetchWithRetry(VERCEL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                legal_text: savedLegalText,
                question: question 
            })
        }, 3);
        
        const rawText = await response.text();
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        // Remove loading message
        loadingEl.remove();
        
        // Add AI response
        const aiMsgEl = document.createElement('div');
        aiMsgEl.className = 'ai-msg';
        aiMsgEl.innerText = rawText.replace(/^"|"$/g, '');
        chatContainer.appendChild(aiMsgEl);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
    } catch (error) {
        console.error("Chat error:", error);
        loadingEl.innerText = `Error: ${error.message}`;
        loadingEl.style.color = "#ff4d4d";
    } finally {
        isLoading = false;
    }
}