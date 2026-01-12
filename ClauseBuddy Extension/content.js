// content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "EXTRACT_TEXT") {
        // We grab the text, clean up extra whitespace, and send it back
        const cleanText = document.body.innerText.replace(/\s+/g, ' ').trim();
        sendResponse({ text: cleanText });
    }
});