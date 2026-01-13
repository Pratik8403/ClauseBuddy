console.log("ClauseBuddy content script loaded");

function extractVisibleText() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let text = "";
  let node;

  while ((node = walker.nextNode())) {
    const value = node.nodeValue.replace(/\s+/g, " ").trim();

    if (value.length > 30) {
      text += value + "\n";
    }
  }

  return text.slice(0, 12000);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_PAGE_TEXT") {
    try {
      const extracted = extractVisibleText();

      console.log("Extracted length:", extracted.length);

      sendResponse({
        success: true,
        text: extracted
      });
    } catch (err) {
      console.error("Extraction failed:", err);
      sendResponse({
        success: false,
        error: "Could not extract page text"
      });
    }
  }
});
