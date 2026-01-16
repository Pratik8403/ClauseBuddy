document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = document.getElementById('analyzeBtn');

  if (!analyzeBtn) return;

  analyzeBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        alert("No active tab found");
        return;
      }

      await chrome.sidePanel.open({ windowId: tab.windowId });

      chrome.tabs.sendMessage(
        tab.id,
        { action: "GET_PAGE_TEXT" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Message error:", chrome.runtime.lastError.message);
            alert("This page cannot be analyzed.");
            return;
          }

          if (response?.success) {
            chrome.runtime.sendMessage({
              action: "text_scraped",
              legal_text: response.text
            });

            // ✅ CLOSE ONLY AFTER SUCCESS
            setTimeout(() => window.close(), 100);
          } else {
            alert("Failed to extract page text.");
          }
        }
      );
    } catch (err) {
      console.error("Popup failure:", err);
      alert("Failed to start analysis.");
    }
  });
});
