// content.js
function scrapeLegalText() {
    // Collects all text from paragraphs and list items (common in T&Cs)
    const text = Array.from(document.querySelectorAll('p, li'))
        .map(el => el.innerText)
        .join(' ')
        .substring(0, 10000); // Limit to 10k chars for AI efficiency

    chrome.runtime.sendMessage({
        action: "text_scraped",
        legal_text: text
    });
}

// Scrape as soon as the page is ready
if (document.readyState === 'complete') {
    scrapeLegalText();
} else {
    window.addEventListener('load', scrapeLegalText);
}