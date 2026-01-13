document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyzeBtn');

    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            try {
                // 1. Get the currently active tab
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

                if (!tab) {
                    console.error("No active tab found.");
                    return;
                }

                // 2. Open the side panel for the window that owns this tab
                await chrome.sidePanel.open({ windowId: tab.windowId });
                
                // 3. Close the popup only after success
                window.close();
            } catch (error) {
                console.error("Failed to open Side Panel:", error);
                // This alerts you if there is a specific permission error
                alert("Error: " + error.message);
            }
        });
    }
});