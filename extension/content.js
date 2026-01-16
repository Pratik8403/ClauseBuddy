console.log("ClauseBuddy content script loaded");

// ---------- TEXT EXTRACTION ----------
function extractVisibleText() {
  let text = "";

  function extractFromRoot(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          // Skip script/style
          if (parent.tagName === "SCRIPT" || parent.tagName === "STYLE") {
            return NodeFilter.FILTER_REJECT;
          }

          // Visibility check
          const style = window.getComputedStyle(parent);
          if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            style.opacity === "0"
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    let localText = "";

    while ((node = walker.nextNode())) {
      const value = node.nodeValue.replace(/\s+/g, " ").trim();
      if (value.length > 30) {
        localText += value + "\n";
      }
    }

    return localText;
  }

  // Main document
  text += extractFromRoot(document.body);

  // Shadow DOMs
  document.querySelectorAll("*").forEach(el => {
    if (el.shadowRoot) {
      text += extractFromRoot(el.shadowRoot);
    }
  });

  return text.slice(0, 12000);
}

// ---------- DEBOUNCE ----------
function debounce(fn, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

// ---------- WAIT FOR CONTENT ----------
function waitForContent(callback, timeout = 3000) {
  let responded = false;
  let observer;

  const finish = (text) => {
    if (responded) return;
    responded = true;
    if (observer) observer.disconnect();
    callback(text);
  };

  const check = debounce(() => {
    const text = extractVisibleText();
    if (text.length > 100) {
      finish(text);
    }
  }, 400);

  // Initial check
  check();

  // Observe dynamic changes
  observer = new MutationObserver(check);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // Hard timeout fallback
  setTimeout(() => {
    finish(extractVisibleText());
  }, timeout);
}

// ---------- MESSAGE HANDLER ----------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_PAGE_TEXT") {
    try {
      waitForContent((text) => {
        console.log("ClauseBuddy extracted length:", text.length);
        sendResponse({
          success: true,
          text
        });
      });
    } catch (e) {
      sendResponse({
        success: false,
        error: e.message
      });
    }

    // 🔴 REQUIRED: keep message channel alive
    return true;
  }
});
