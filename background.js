/**
 * Background Service Worker pour Gemini Reader (Manifest V3)
 */

// Configuration de l'ouverture automatique du Side Panel au clic sur l'icône de l'action
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Erreur lors de la configuration du Side Panel:", error));

// Initialisation lors de l'installation de l'extension
chrome.runtime.onInstalled.addListener(async () => {
  // Enregistrement des éléments du menu contextuel
  chrome.contextMenus.create({
    id: "read-selection",
    title: "Lire cette sélection avec Gemini Reader",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "read-page",
    title: "Lire toute la page avec Gemini Reader",
    contexts: ["page"]
  });

  // Initialisation des paramètres par défaut si absents
  const settings = await chrome.storage.local.get([
    "geminiApiKey",
    "speechEngine",
    "geminiVoice",
    "playbackRate",
    "autoExtract"
  ]);

  const defaults = {
    speechEngine: "gemini", // "gemini" ou "native"
    geminiVoice: "Kore",    // Kore, Puck, Zephyr, Fenrir, Aoede, etc.
    geminiModel: "gemini-3.8-flash",
    playbackRate: 1.0,
    autoExtract: true
  };

  const toSet = {};
  for (const [k, v] of Object.entries(defaults)) {
    if (settings[k] === undefined) {
      toSet[k] = v;
    }
  }

  if (Object.keys(toSet).length > 0) {
    await chrome.storage.local.set(toSet);
  }
});

// Gestion des clics sur les menus contextuels
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;

  try {
    // 1. Ouvrir le panneau latéral pour cette fenêtre
    await chrome.sidePanel.open({ windowId: tab.windowId });

    // 2. Si l'action est de lire une sélection spécifique
    if (info.menuItemId === "read-selection" && info.selectionText) {
      await chrome.storage.local.set({
        pendingSelection: {
          text: info.selectionText,
          tabId: tab.id,
          timestamp: Date.now()
        }
      });
      // Notifier le panneau latéral s'il est déjà ouvert
      chrome.runtime.sendMessage({
        type: "SELECTION_CHANGED",
        selectionText: info.selectionText,
        tabId: tab.id
      }).catch(() => {
        // Le panneau n'était peut-être pas encore prêt, le pendingSelection sera lu à l'initialisation
      });
    } else if (info.menuItemId === "read-page") {
      chrome.runtime.sendMessage({
        type: "TRIGGER_EXTRACT_PAGE",
        tabId: tab.id
      }).catch(() => {});
    }
  } catch (error) {
    console.error("Erreur lors de l'exécution du menu contextuel:", error);
  }
});

// Écoute des messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PING") {
    sendResponse({ status: "PONG" });
    return false;
  }
  return false;
});
