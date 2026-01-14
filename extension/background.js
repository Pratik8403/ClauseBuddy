// background.js
chrome.runtime.onInstalled.addListener(() => {
    console.log("ClauseBuddy Service Worker Active");
});

// Ensures the side panel opens only when we explicitly call it
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: false })
  .catch((error) => console.error(error));

// Relay messages between popup/content script and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "text_scraped") {
        // Forward the message to all tabs (side panel will receive it)
        chrome.runtime.sendMessage(message);
    }
});