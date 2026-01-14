console.log("ClauseBuddy content script loaded");

// Enhanced text extraction with Shadow DOM support
function extractVisibleText() {
  let text = "";
  
  // Helper function to extract text from a root element (including Shadow DOM)
  function extractFromRoot(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip script and style tags
          const parent = node.parentElement;
          if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Check if element is visible
          if (parent && parent.offsetParent === null && parent.tagName !== 'BODY') {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
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
  
  // Extract from main document
  text += extractFromRoot(document.body);
  
  // Extract from Shadow DOM elements
  const shadowHosts = document.querySelectorAll('*');
  shadowHosts.forEach(host => {
    if (host.shadowRoot) {
      text += extractFromRoot(host.shadowRoot);
    }
  });
  
  return text.slice(0, 12000);
}

// Debounce function to avoid excessive processing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Wait for dynamic content to load
function waitForContent(callback, timeout = 3000) {
  let observer;
  let timeoutId;
  
  const checkContent = debounce(() => {
    const text = extractVisibleText();
    if (text.length > 100) {
      if (observer) observer.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
      callback(text);
    }
  }, 500);
  
  // Initial check
  checkContent();
  
  // Set up MutationObserver for dynamic content
  observer = new MutationObserver(() => {
    checkContent();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
  
  // Fallback timeout
  timeoutId = setTimeout(() => {
    if (observer) observer.disconnect();
    const text = extractVisibleText();
    callback(text);
  }, timeout);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_PAGE_TEXT") {
    try {
      // Wait for dynamic content before extracting
      waitForContent((text) => {
        console.log("Extracted length:", text.length);
        sendResponse({
          success: true,
          text: text
        });
      });
      
      // Return true to indicate async response
      return true;
    } catch (err) {
      console.error("Extraction failed:", err);
      sendResponse({
        success: false,
        error: "Could not extract page text"
      });
    }
  }
});
