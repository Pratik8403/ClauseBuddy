// background.js
chrome.runtime.onInstalled.addListener(() => {
    console.log("ClauseBuddy Service Worker Active");
});

// Ensures the side panel opens only when we explicitly call it
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: false })
  .catch((error) => console.error(error));