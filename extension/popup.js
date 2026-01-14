document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyzeBtn');

    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            try {
                // 1. Get the currently active tab
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

                if (!tab || !tab.id) {
                    console.error("No active tab found.");
                    alert("Error: Could not find active tab");
                    return;
                }

                // 2. Open the side panel for the window that owns this tab
                await chrome.sidePanel.open({ windowId: tab.windowId });
                
                // 3. Extract text from the current page
                chrome.tabs.sendMessage(tab.id, { action: "GET_PAGE_TEXT" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error sending message:", chrome.runtime.lastError);
                        return;
                    }
                    
                    if (response && response.success) {
                        // Send the extracted text to the side panel
                        chrome.runtime.sendMessage({
                            action: "text_scraped",
                            legal_text: response.text
                        });
                    } else {
                        console.error("Failed to extract text:", response?.error);
                    }
                });
                
                // 4. Close the popup only after success
                window.close();
            } catch (error) {
                console.error("Failed to open Side Panel:", error);
                alert("Error: " + error.message);
            }
        });
    }
});