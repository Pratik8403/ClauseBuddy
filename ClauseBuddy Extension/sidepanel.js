// sidepanel.js
document.addEventListener('DOMContentLoaded', async () => {
    const loadingView = document.getElementById('loadingView');
    const resultView = document.getElementById('resultView');

    // 1. Find the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 2. Request the text from the Content Script
    chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_TEXT" }, (response) => {
        if (response && response.text) {
            // FOR NOW: We simulate the AI "thinking" for 1.5 seconds
            setTimeout(() => {
                loadingView.style.display = 'none';
                resultView.style.display = 'block';
                
                // This is where we will eventually put the REAL AI summary
                console.log("Text received, ready for AI analysis!");
            }, 1500);
        } else {
            document.querySelector('#loadingView p').innerText = "Unable to read this page. Try refreshing!";
        }
    });
});