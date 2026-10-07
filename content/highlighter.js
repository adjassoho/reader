/**
 * Gemini Reader - Page Highlighter
 * Surligne la phrase active en cours de lecture vocale sur la page source ou dans ses iframes.
 */

(function () {
  const HIGHLIGHT_CLASS = 'gemini-reader-active-highlight';

  function injectStyles(doc = document) {
    if (doc.getElementById('gemini-reader-highlight-style')) return;
    const style = doc.createElement('style');
    style.id = 'gemini-reader-highlight-style';
    style.textContent = `
      .${HIGHLIGHT_CLASS} {
        background-color: #fef08a !important;
        color: #1e1b4b !important;
        padding: 2px 4px !important;
        border-radius: 4px !important;
        box-shadow: 0 0 0 2px #facc15, 0 2px 6px rgba(0,0,0,0.15) !important;
        transition: background-color 0.25s ease !important;
      }
      @media (prefers-color-scheme: dark) {
        .${HIGHLIGHT_CLASS} {
          background-color: #854d0e !important;
          color: #fef9c3 !important;
          box-shadow: 0 0 0 2px #ca8a04, 0 2px 6px rgba(0,0,0,0.4) !important;
        }
      }
    `;
    doc.head?.appendChild(style);
  }

  function removeHighlightsFromDoc(doc = document) {
    try {
      const highlights = doc.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
      highlights.forEach(el => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(doc.createTextNode(el.textContent), el);
          parent.normalize();
        }
      });

      // Nettoyer également dans les iframes same-origin
      doc.querySelectorAll('iframe').forEach(iframe => {
        try {
          const idoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (idoc) removeHighlightsFromDoc(idoc);
        } catch (e) {}
      });
    } catch (e) {}
  }

  function highlightInDocument(doc, targetText) {
    if (!doc || !doc.body || !targetText) return false;

    injectStyles(doc);

    const trimmed = targetText.trim();
    // Échantillon pour la recherche textuelle
    const searchSample = trimmed.length > 35 ? trimmed.substring(0, 35) : trimmed;

    const walker = doc.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          const parentTag = node.parentElement?.tagName?.toLowerCase();
          if (['script', 'style', 'noscript', 'textarea', 'input'].includes(parentTag)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.textContent.includes(searchSample)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    const node = walker.nextNode();
    if (node && node.parentElement) {
      const parent = node.parentElement;
      const index = node.textContent.indexOf(searchSample);
      if (index !== -1) {
        const before = node.textContent.substring(0, index);
        const matchLength = Math.min(node.textContent.length - index, trimmed.length);
        const matched = node.textContent.substring(index, index + matchLength);
        const after = node.textContent.substring(index + matchLength);

        const mark = doc.createElement('mark');
        mark.className = HIGHLIGHT_CLASS;
        mark.textContent = matched;

        const fragment = doc.createDocumentFragment();
        if (before) fragment.appendChild(doc.createTextNode(before));
        fragment.appendChild(mark);
        if (after) fragment.appendChild(doc.createTextNode(after));

        parent.replaceChild(fragment, node);

        mark.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });

        return true;
      }
    }

    // Si pas trouvé dans ce document, chercher dans les iframes
    const iframes = doc.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const idoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (idoc && highlightInDocument(idoc, targetText)) {
          return true;
        }
      } catch (e) {}
    }

    return false;
  }

  function highlightSentence(targetText) {
    removeHighlightsFromDoc(document);
    if (!targetText || targetText.trim().length < 4) return;
    highlightInDocument(document, targetText);
  }

  window.__geminiHighlight = highlightSentence;
  window.__geminiClearHighlight = () => removeHighlightsFromDoc(document);

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'HIGHLIGHT_SENTENCE') {
        highlightSentence(message.sentence);
        sendResponse({ success: true });
        return false;
      }

      if (message.type === 'CLEAR_HIGHLIGHT') {
        removeHighlightsFromDoc(document);
        sendResponse({ success: true });
        return false;
      }
    });
  }

})();
