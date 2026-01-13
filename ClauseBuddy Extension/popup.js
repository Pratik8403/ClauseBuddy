document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('open-sidebar');

    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', () => {
            // Get the ID of the window where the popup was clicked
            chrome.windows.getCurrent((currentWindow) => {
                // Open the side panel specifically for this window
                chrome.sidePanel.open({ windowId: currentWindow.id })
                    .then(() => {
                        console.log("Side panel active.");
                        // Close the small popup automatically
                        window.close(); 
                    })
                    .catch((error) => {
                        console.error("SidePanel open failed:", error);
                    });
            });
        });
    }
});