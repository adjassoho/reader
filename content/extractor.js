/**
 * Gemini Reader - Content Extractor
 * Extrait intelligemment le contenu textuel essentiel d'une page web en éliminant les bruits,
 * les éléments cachés et les textes réservés aux lecteurs d'écran (ex: .sr, .sr-only dans Open edX).
 * Prend en charge l'extraction dans les iframes (cours en ligne, LMS, embeds).
 */

(function () {
  /**
   * Sélecteurs d'éléments indésirables à exclure strictement lors de l'extraction
   */
  const NOISE_SELECTORS = [
    // Scripts et styles
    'script', 'style', 'noscript', 'template', 'svg', 'canvas',
    // Navigation, en-têtes et pieds de page globaux
    'nav', 'footer', 'header', 'aside', 'form', 'dialog',
    // Contrôles et boutons interactifs d'interface
    'button', 'input', 'select', 'textarea', '[role="button"]',
    // Rôles ARIA de structure non textuelle
    '[role="banner"]', '[role="navigation"]', '[role="complementary"]',
    // Éléments masqués ou réservés aux lecteurs d'écran (Open edX, Bootstrap, Tailwind, WordPress)
    '[aria-hidden="true"]', '[hidden]', '.hidden',
    '.sr', '.sr-only', '.visually-hidden', '.visuallyhidden',
    '.screen-reader-text', '.screen-reader-response', '.a11y-hidden',
    // Bannières publicitaires, cookies et réseaux sociaux
    '.ad', '.ads', '.advertisement', '.social-share', '.share-buttons',
    '.comments', '#comments', '.cookie-banner', '.newsletter-signup',
    '.sidebar', '#sidebar'
  ];

  const NOISE_SELECTOR_STRING = NOISE_SELECTORS.join(', ');

  /**
   * Vérifie si un élément est visuellement visible pour l'utilisateur
   */
  function isElementVisible(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if (el.hasAttribute('hidden')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;

    // Classes courantes pour masquer du texte
    const classList = el.classList;
    if (classList.contains('sr') || classList.contains('sr-only') ||
        classList.contains('visually-hidden') || classList.contains('visuallyhidden') ||
        classList.contains('screen-reader-text') || classList.contains('hidden')) {
      return false;
    }

    try {
      const style = window.getComputedStyle(el);
      if (!style) return true;
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
      // Masquage technique de type "clip" ou 1x1px souvent utilisé par les .sr
      if (style.clip === 'rect(0px, 0px, 0px, 0px)' || style.clipPath === 'inset(50%)') {
        return false;
      }
      if (parseFloat(style.width) <= 1 && parseFloat(style.height) <= 1 && style.overflow === 'hidden') {
        return false;
      }
    } catch (e) {
      // Ignorer si getComputedStyle échoue
    }

    return true;
  }

  /**
   * Découpe un texte en phrases exploitables pour la lecture audio et le surlignage
   */
  function splitIntoSentences(text) {
    if (!text) return [];
    // Découpage basé sur la ponctuation forte tout en évitant les coupures sur les abréviations simples
    const regex = /[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g;
    const matches = text.match(regex) || [text];
    return matches
      .map(s => s.trim())
      .filter(s => s.length > 2);
  }

  /**
   * Extrait le titre le plus pertinent
   */
  function extractTitle(doc = document) {
    // 1. Chercher un h2 de contenu d'unité (très courant dans Open edX : .unit-header h2)
    const unitH2 = doc.querySelector('.unit-header h2, .course-wrapper h2, .xblock h2');
    if (unitH2 && isElementVisible(unitH2) && unitH2.innerText.trim()) {
      return unitH2.innerText.trim();
    }

    // 2. OpenGraph
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
    if (ogTitle && ogTitle.trim()) return ogTitle.trim();

    // 3. H1 principal
    const h1 = doc.querySelector('article h1, main h1, h1');
    if (h1 && isElementVisible(h1) && h1.innerText.trim()) {
      return h1.innerText.trim();
    }

    return doc.title || 'Page sans titre';
  }

  /**
   * Extrait les blocs de texte valides d'un document ou conteneur
   */
  function extractTextBlocksFromRoot(root) {
    if (!root) return [];
    const blocks = [];

    // Sélectionner les éléments textuels clés
    const elements = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, blockquote'));

    elements.forEach(el => {
      // Rejeter si l'élément ou un parent fait partie du bruit
      if (el.closest(NOISE_SELECTOR_STRING)) return;

      // Rejeter si non visible
      if (!isElementVisible(el)) return;

      // Cloner l'élément pour enlever tout élément parasite interne (ex: un <span class="sr"> à l'intérieur d'un <h2>)
      const clone = el.cloneNode(true);
      clone.querySelectorAll(NOISE_SELECTOR_STRING).forEach(n => n.remove());

      const text = (clone.innerText || clone.textContent || '').trim();

      // Ignorer les segments trop courts ou vides
      if (text.length > 5) {
        blocks.push({
          tag: el.tagName.toLowerCase(),
          text: text
        });
      }
    });

    return blocks;
  }

  /**
   * Extrait le contenu depuis les iframes same-origin accessibles
   */
  function extractFromSameOriginIframes(doc = document) {
    const iframeBlocks = [];
    const iframes = Array.from(doc.querySelectorAll('iframe'));

    for (const iframe of iframes) {
      try {
        // Ignorer les iframes invisibles ou minuscules (trackers)
        if (iframe.offsetWidth > 0 && (iframe.offsetWidth < 50 || iframe.offsetHeight < 50)) continue;

        const idoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (idoc && idoc.body) {
          const blocks = extractTextBlocksFromRoot(idoc.body);
          if (blocks.length > 0) {
            iframeBlocks.push(...blocks);
          }
        }
      } catch (e) {
        // Iframe cross-origin, sera géré par l'exécution multi-frames de sidepanel.js
      }
    }

    return iframeBlocks;
  }

  /**
   * Fonction principale d'extraction de contenu
   */
  function extractArticleContent() {
    // 1. Priorité absolue : sélection manuelle de l'utilisateur si existante
    const selection = window.getSelection()?.toString().trim();
    if (selection && selection.length > 20) {
      const paragraphs = selection.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
      const sentences = splitIntoSentences(selection);
      const wordCount = selection.split(/\s+/).filter(Boolean).length;

      return {
        isSelection: true,
        title: `Sélection (${wordCount} mots)`,
        url: window.location.href,
        text: selection,
        paragraphs: paragraphs,
        sentences: sentences,
        wordCount: wordCount,
        readingTimeMinutes: Math.max(1, Math.ceil(wordCount / 180))
      };
    }

    const title = extractTitle(document);

    // 2. Vérifier si les iframes de la page contiennent le corps principal de l'article (ex: Open edX, LMS, Substack)
    const iframeBlocks = extractFromSameOriginIframes(document);
    let blocks = [];

    if (iframeBlocks.length > 0) {
      // Le contenu réel se trouve dans l'iframe
      if (title && title !== 'Page sans titre') {
        const titleAlreadyPresent = iframeBlocks.some(b => b.text.toLowerCase().includes(title.toLowerCase()));
        if (!titleAlreadyPresent) {
          blocks.push({ tag: 'h1', text: title });
        }
      }
      blocks.push(...iframeBlocks);
    } else {
      // Page standard sans iframe
      blocks = extractTextBlocksFromRoot(document.body);
    }

    // Dédupliquer les blocs consécutifs identiques
    const uniqueBlocks = [];
    const seenTexts = new Set();
    for (const b of blocks) {
      if (!seenTexts.has(b.text)) {
        seenTexts.add(b.text);
        uniqueBlocks.push(b);
      }
    }

    // Assembler le texte complet
    let fullText = uniqueBlocks.map(b => b.text).join('\n\n');

    // Découpage en paragraphes et phrases
    const paragraphs = fullText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const sentences = splitIntoSentences(fullText);
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    return {
      isSelection: false,
      title: title,
      url: window.location.href,
      text: fullText,
      paragraphs: paragraphs,
      sentences: sentences,
      wordCount: wordCount,
      readingTimeMinutes: Math.max(1, Math.ceil(wordCount / 180))
    };
  }

  // Rendre la fonction accessible directement par executeScript
  window.__geminiExtract = extractArticleContent;

  // Écouteur des messages (si exécuté dans un contexte d'extension valide)
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'EXTRACT_PAGE_CONTENT') {
        try {
          const content = extractArticleContent();
          sendResponse({ success: true, data: content });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
        return false;
      }

      if (message.type === 'GET_SELECTION') {
        const selection = window.getSelection()?.toString().trim() || '';
        sendResponse({ selection });
        return false;
      }
    });
  }

})();
