/**
 * Gemini Reader - Side Panel Controller
 * Gère l'extraction de page, la synchronisation du lecteur audio,
 * l'affichage épuré et les interactions avec l'API Gemini.
 */

import { GeminiClient } from './gemini-client.js';

class GeminiReaderApp {
  constructor() {
    this.gemini = new GeminiClient();
    this.state = {
      activeTabId: null,
      pageData: null,
      currentSentenceIndex: 0,
      isPlaying: false,
      isPaused: false,
      playbackRate: 1.0,
      speechEngine: 'native', // 'native' par défaut pour une lecture fluide sans limitation de quota
      geminiVoice: 'Kore',
      selectedNativeVoiceUri: '',
      autoExtract: true,
      readerFontSize: 15
    };

    // Contrôleurs audio & session
    this.speechSessionId = 0;
    this.nativeVoices = [];
    this.toastTimer = null;
    this.audioContext = null;
    this.currentAudioSource = null;
    this.currentUtterance = null;
    this.currentAudioElement = null;
    this.chatHistory = [];

    this.initElements();
    this.bindEvents();
    this.init();
  }

  /**
   * Récupération des éléments DOM
   */
  initElements() {
    // Statut & En-tête
    this.statusBadge = document.getElementById('status-badge');
    this.btnRefresh = document.getElementById('btn-refresh');
    this.apiKeyBanner = document.getElementById('api-key-banner');
    this.btnOpenSettingsBanner = document.getElementById('btn-open-settings-banner');
    this.toastNotification = document.getElementById('toast-notification');

    // Onglets
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.tabPanes = document.querySelectorAll('.tab-pane');

    // Lecteur Audio
    this.articleTitle = document.getElementById('article-title');
    this.articleWordCount = document.getElementById('article-word-count');
    this.articleReadingTime = document.getElementById('article-reading-time');
    this.currentSentenceDisplay = document.getElementById('current-sentence-display');
    this.progressContainer = document.getElementById('progress-container');
    this.progressFill = document.getElementById('progress-fill');
    this.progressText = document.getElementById('progress-text');
    this.progressPercentage = document.getElementById('progress-percentage');
    this.btnPrev = document.getElementById('btn-prev');
    this.btnPlayPause = document.getElementById('btn-play-pause');
    this.iconPlay = document.getElementById('icon-play');
    this.iconPause = document.getElementById('icon-pause');
    this.btnStop = document.getElementById('btn-stop');
    this.btnNext = document.getElementById('btn-next');
    this.speedButtons = document.querySelectorAll('.speed-pills .pill-btn');
    this.currentEngineTag = document.getElementById('current-engine-tag');

    // Mode Lecture Zen
    this.readerContentBody = document.getElementById('reader-content-body');
    this.btnFontSmaller = document.getElementById('btn-font-smaller');
    this.btnFontLarger = document.getElementById('btn-font-larger');

    // Résumé IA
    this.btnGenerateSummary = document.getElementById('btn-generate-summary');
    this.btnSimplifyText = document.getElementById('btn-simplify-text');
    this.summaryContainer = document.getElementById('summary-result-container');
    this.summaryTypeBadge = document.getElementById('summary-type-badge');
    this.summaryContentText = document.getElementById('summary-content-text');
    this.btnListenSummary = document.getElementById('btn-listen-summary');
    this.summaryLoader = document.getElementById('summary-loader');

    // Chat Assistant
    this.chatContainer = document.getElementById('chat-messages');
    this.chatForm = document.getElementById('chat-form');
    this.chatInput = document.getElementById('chat-input');
    this.promptChips = document.querySelectorAll('.prompt-chips .chip');
    this.btnClearChat = document.getElementById('btn-clear-chat');

    // Paramètres
    this.inputApiKey = document.getElementById('input-api-key');
    this.btnToggleKeyVisibility = document.getElementById('btn-toggle-key-visibility');
    this.btnSaveKey = document.getElementById('btn-save-key');
    this.btnTestKey = document.getElementById('btn-test-key');
    this.keyTestStatus = document.getElementById('key-test-status');
    this.selectGeminiModel = document.getElementById('select-gemini-model');
    this.engineRadioButtons = document.querySelectorAll('input[name="speechEngine"]');
    this.selectNativeVoice = document.getElementById('select-native-voice');
    this.btnTestNativeVoice = document.getElementById('btn-test-native-voice');
    this.groupNativeVoice = document.getElementById('group-native-voice');
    this.selectGeminiVoice = document.getElementById('select-gemini-voice');
    this.btnTestVoice = document.getElementById('btn-test-voice');
    this.checkAutoExtract = document.getElementById('check-auto-extract');
    this.groupGeminiVoice = document.getElementById('group-gemini-voice');
  }

  /**
   * Attachement des écouteurs d'événements
   */
  bindEvents() {
    // Changement d'onglets
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Actualiser
    this.btnRefresh.addEventListener('click', () => this.extractActiveTabContent(true));
    this.btnOpenSettingsBanner.addEventListener('click', () => this.switchTab('tab-settings'));

    // Contrôles Audio
    this.btnPlayPause.addEventListener('click', () => this.togglePlayPause());
    this.btnStop.addEventListener('click', () => this.stopPlayback());
    this.btnPrev.addEventListener('click', () => this.previousSentence());
    this.btnNext.addEventListener('click', () => this.nextSentence());
    this.progressContainer.addEventListener('click', (e) => this.handleProgressClick(e));

    // Vitesse
    this.speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.speedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setPlaybackRate(parseFloat(btn.dataset.speed));
      });
    });

    // Zoom police Zen
    this.btnFontSmaller.addEventListener('click', () => this.adjustFontSize(-1));
    this.btnFontLarger.addEventListener('click', () => this.adjustFontSize(1));

    // Résumé IA
    this.btnGenerateSummary.addEventListener('click', () => this.handleGenerateSummary());
    this.btnSimplifyText.addEventListener('click', () => this.handleSimplifyText());
    this.btnListenSummary.addEventListener('click', () => this.handleListenSummary());

    // Chat Assistant
    this.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSendChatMessage();
    });
    this.promptChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.chatInput.value = chip.dataset.prompt;
        this.handleSendChatMessage();
      });
    });
    if (this.btnClearChat) {
      this.btnClearChat.addEventListener('click', () => this.clearChatHistory());
    }

    // Paramètres
    this.btnToggleKeyVisibility.addEventListener('click', () => this.toggleKeyVisibility());
    this.btnSaveKey.addEventListener('click', () => this.saveApiKey());
    this.btnTestKey.addEventListener('click', () => this.testApiKey());
    this.btnTestVoice.addEventListener('click', () => this.testVoiceSample());
    this.btnTestNativeVoice.addEventListener('click', () => this.testNativeVoiceSample());

    if (this.selectGeminiModel) {
      this.selectGeminiModel.addEventListener('change', (e) => {
        const model = e.target.value;
        this.gemini.setPreferredModel(model);
        chrome.storage.local.set({ geminiModel: model });
        const label = model === 'auto' ? 'Automatique (Haute résilience)' : model;
        this.showToast(`Modèle IA configuré : ${label}`, 3000);
      });
    }

    this.selectNativeVoice.addEventListener('change', (e) => {
      this.state.selectedNativeVoiceUri = e.target.value;
      chrome.storage.local.set({ selectedNativeVoiceUri: e.target.value });
    });

    this.engineRadioButtons.forEach(r => {
      r.addEventListener('change', (e) => {
        this.setSpeechEngine(e.target.value);
      });
    });

    this.selectGeminiVoice.addEventListener('change', (e) => {
      this.state.geminiVoice = e.target.value;
      chrome.storage.local.set({ geminiVoice: e.target.value });
    });

    this.checkAutoExtract.addEventListener('change', (e) => {
      this.state.autoExtract = e.target.checked;
      chrome.storage.local.set({ autoExtract: e.target.checked });
    });

    // Écouter les changements d'onglets du navigateur
    chrome.tabs.onActivated.addListener(async () => {
      if (this.state.autoExtract && !this.state.isPlaying) {
        await this.extractActiveTabContent();
      }
    });

    // Messages envoyés par background.js
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'SELECTION_CHANGED') {
        this.extractActiveTabContent();
      } else if (message.type === 'TRIGGER_EXTRACT_PAGE') {
        this.extractActiveTabContent(true);
      }
    });
  }

  /**
   * Initialisation de l'application
   */
  async init() {
    this.updateStatus('Initialisation...');

    // Charger les réglages enregistrés
    const stored = await chrome.storage.local.get([
      'geminiApiKey',
      'geminiModel',
      'speechEngine',
      'geminiVoice',
      'selectedNativeVoiceUri',
      'playbackRate',
      'autoExtract',
      'readerFontSize',
      'pendingSelection'
    ]);

    if (stored.geminiApiKey) {
      this.gemini.setApiKey(stored.geminiApiKey);
      this.inputApiKey.value = stored.geminiApiKey;
      this.apiKeyBanner.classList.add('hidden');
    } else {
      this.apiKeyBanner.classList.remove('hidden');
    }

    if (stored.geminiModel) {
      if (this.selectGeminiModel) this.selectGeminiModel.value = stored.geminiModel;
      this.gemini.setPreferredModel(stored.geminiModel);
    }

    if (stored.speechEngine) {
      this.state.speechEngine = stored.speechEngine;
      const radio = document.querySelector(`input[name="speechEngine"][value="${stored.speechEngine}"]`);
      if (radio) radio.checked = true;
    }

    if (stored.selectedNativeVoiceUri) {
      this.state.selectedNativeVoiceUri = stored.selectedNativeVoiceUri;
    }

    if (stored.geminiVoice) {
      this.state.geminiVoice = stored.geminiVoice;
      this.selectGeminiVoice.value = stored.geminiVoice;
    }

    if (stored.playbackRate) {
      this.state.playbackRate = stored.playbackRate;
      this.speedButtons.forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.speed) === stored.playbackRate);
      });
    }

    if (stored.autoExtract !== undefined) {
      this.state.autoExtract = stored.autoExtract;
      this.checkAutoExtract.checked = stored.autoExtract;
    }

    if (stored.readerFontSize) {
      this.state.readerFontSize = stored.readerFontSize;
      this.readerContentBody.style.setProperty('--reader-font-size', `${stored.readerFontSize}px`);
    }

    this.loadNativeVoices();
    this.updateEngineUI();

    // Extraire le contenu de l'onglet actif
    await this.extractActiveTabContent();

    this.updateStatus('Prêt');
  }

  /**
   * Bascule d'onglet d'interface
   */
  switchTab(tabId) {
    this.tabButtons.forEach(btn => {
      const active = btn.dataset.tab === tabId;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    this.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });
  }

  /**
   * Affiche une notification toast discrète
   */
  showToast(message, duration = 6000) {
    if (!this.toastNotification) return;
    this.toastNotification.textContent = message;
    this.toastNotification.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastNotification.classList.add('hidden');
    }, duration);
  }

  /**
   * Charge les voix natives du navigateur
   */
  loadNativeVoices() {
    if (!('speechSynthesis' in window)) return;

    const populate = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      this.nativeVoices = voices;
      this.selectNativeVoice.innerHTML = '';

      const frenchVoices = voices.filter(v => v.lang.startsWith('fr'));
      const otherVoices = voices.filter(v => !v.lang.startsWith('fr'));

      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = 'Voix française système par défaut';
      this.selectNativeVoice.appendChild(defaultOpt);

      if (frenchVoices.length > 0) {
        const groupFr = document.createElement('optgroup');
        groupFr.label = 'Voix Françaises Disponibles';
        frenchVoices.forEach(v => {
          const opt = document.createElement('option');
          opt.value = v.voiceURI;
          opt.textContent = `${v.name} (${v.lang})${v.default ? ' — Par défaut' : ''}`;
          if (v.voiceURI === this.state.selectedNativeVoiceUri) {
            opt.selected = true;
          }
          groupFr.appendChild(opt);
        });
        this.selectNativeVoice.appendChild(groupFr);
      }

      if (otherVoices.length > 0) {
        const groupOther = document.createElement('optgroup');
        groupOther.label = 'Autres Voix Système';
        otherVoices.slice(0, 10).forEach(v => {
          const opt = document.createElement('option');
          opt.value = v.voiceURI;
          opt.textContent = `${v.name} (${v.lang})`;
          if (v.voiceURI === this.state.selectedNativeVoiceUri) {
            opt.selected = true;
          }
          groupOther.appendChild(opt);
        });
        this.selectNativeVoice.appendChild(groupOther);
      }
    };

    populate();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populate;
    }
  }

  /**
   * Test de la voix locale du navigateur
   */
  testNativeVoiceSample() {
    const sample = "Bonjour ! La synthèse vocale locale de votre navigateur fonctionne parfaitement.";
    const u = new SpeechSynthesisUtterance(sample);
    u.lang = 'fr-FR';
    if (this.state.selectedNativeVoiceUri && this.nativeVoices) {
      const match = this.nativeVoices.find(v => v.voiceURI === this.state.selectedNativeVoiceUri);
      if (match) u.voice = match;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  /**
   * Met à jour le badge de statut
   */
  updateStatus(text) {
    this.statusBadge.textContent = text;
  }

  /**
   * Met à jour l'affichage selon le moteur audio actif
   */
  updateEngineUI() {
    const isGemini = this.state.speechEngine === 'gemini';
    this.currentEngineTag.textContent = isGemini ? `IA (${this.state.geminiVoice})` : 'Navigateur';
    this.currentEngineTag.className = `engine-tag ${isGemini ? 'gemini' : 'native'}`;
    this.groupGeminiVoice.style.display = isGemini ? 'block' : 'none';
    if (this.groupNativeVoice) {
      this.groupNativeVoice.style.display = isGemini ? 'none' : 'block';
    }
  }

  /**
   * Modifie le moteur de synthèse vocale
   */
  async setSpeechEngine(engine) {
    this.state.speechEngine = engine;
    await chrome.storage.local.set({ speechEngine: engine });
    this.updateEngineUI();
    if (this.state.isPlaying) {
      // Relancer la lecture avec le nouveau moteur
      this.playSentence(this.state.currentSentenceIndex);
    }
  }

  /**
   * Modifie la vitesse de lecture
   */
  async setPlaybackRate(rate) {
    this.state.playbackRate = rate;
    await chrome.storage.local.set({ playbackRate: rate });

    if (this.currentUtterance && window.speechSynthesis.speaking) {
      // Pour la synthèse vocale native
      this.stopPlayback();
      this.playSentence(this.state.currentSentenceIndex);
    } else if (this.currentAudioElement) {
      this.currentAudioElement.playbackRate = rate;
    }
  }

  /**
   * Ajuste la taille de la police en mode Zen
   */
  adjustFontSize(delta) {
    this.state.readerFontSize = Math.max(12, Math.min(24, this.state.readerFontSize + delta));
    this.readerContentBody.style.setProperty('--reader-font-size', `${this.state.readerFontSize}px`);
    chrome.storage.local.set({ readerFontSize: this.state.readerFontSize });
  }

  /**
   * Extraction de contenu depuis l'onglet actif (y compris tous ses iframes/cadres)
   */
  async extractActiveTabContent(forceRefresh = false) {
    try {
      this.updateStatus('Extraction...');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        this.updateStatus('Onglet indisponible');
        return;
      }

      this.state.activeTabId = tab.id;

      // S'assurer que les scripts de contenu sont injectés dans TOUS les cadres (y compris iframes)
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ['content/extractor.js', 'content/highlighter.js']
        });
      } catch (err) {
        console.warn("Erreur injection scripts:", err);
      }

      // Exécuter l'extraction sur TOUS les cadres (principal et iframes)
      const frameResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: () => {
          try {
            if (typeof window.__geminiExtract === 'function') {
              return window.__geminiExtract();
            }
          } catch (e) {
            return null;
          }
          return null;
        }
      });

      let bestData = null;
      let topFrameTitle = '';

      if (Array.isArray(frameResults)) {
        for (const f of frameResults) {
          const res = f.result;
          if (!res) continue;

          if (f.frameId === 0 && res.title) {
            topFrameTitle = res.title;
          }

          // Si l'utilisateur a fait une sélection explicite dans un cadre, la privilégier
          if (res.isSelection) {
            bestData = res;
            break;
          }

          // Privilégier le cadre ayant le contenu textuel le plus riche
          if (!bestData || (res.wordCount || 0) > (bestData.wordCount || 0)) {
            bestData = res;
          }
        }
      }

      // Conserver le titre du cadre principal si le cadre secondaire a un titre générique
      if (bestData && topFrameTitle && (!bestData.title || bestData.title === 'Page sans titre' || bestData.title.length < 5)) {
        if (!bestData.isSelection) {
          bestData.title = topFrameTitle;
        }
      }

      if (bestData && bestData.sentences && bestData.sentences.length > 0) {
        this.setPageData(bestData);
      } else {
        this.articleTitle.textContent = "Aucun texte lisible détecté.";
        this.updateStatus('Page vide');
      }
    } catch (err) {
      console.warn("Extraction impossible sur cette page:", err);
      this.articleTitle.textContent = "Page protégée ou inaccessible.";
      this.updateStatus('Inaccessible');
    }
  }

  /**
   * Configure les données de la page extraite
   */
  setPageData(data) {
    this.state.pageData = data;
    this.state.currentSentenceIndex = 0;

    // Métadonnées
    this.articleTitle.textContent = data.title || 'Page sans titre';
    this.articleWordCount.textContent = `${data.wordCount || 0} mots`;
    this.articleReadingTime.textContent = `~${data.readingTimeMinutes || 1} min`;

    // Mode Lecture Zen
    this.renderZenReader(data);

    // Initialiser l'affichage de phrase
    if (data.sentences && data.sentences.length > 0) {
      this.currentSentenceDisplay.textContent = data.sentences[0];
    } else {
      this.currentSentenceDisplay.textContent = "Aucune phrase détectée.";
    }

    this.updateProgress();
    this.updateStatus('Prêt');
  }

  /**
   * Rendu du texte pour la lecture Zen
   */
  renderZenReader(data) {
    this.readerContentBody.innerHTML = '';

    if (!data.paragraphs || data.paragraphs.length === 0) {
      this.readerContentBody.innerHTML = '<p class="placeholder-text">Aucun contenu textuel extrait.</p>';
      return;
    }

    let globalSentenceIndex = 0;

    data.paragraphs.forEach(paraText => {
      const p = document.createElement('p');
      p.className = 'reader-paragraph';

      // Découper ce paragraphe en phrases
      const regex = /[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g;
      const sentences = paraText.match(regex) || [paraText];

      sentences.forEach(sent => {
        const span = document.createElement('span');
        span.className = 'reader-sentence';
        span.textContent = sent + ' ';
        span.dataset.index = globalSentenceIndex;

        const sentIdx = globalSentenceIndex;
        span.addEventListener('click', () => {
          this.jumpToSentence(sentIdx);
        });

        p.appendChild(span);
        globalSentenceIndex++;
      });

      this.readerContentBody.appendChild(p);
    });
  }

  /**
   * Bascule Lecture / Pause
   */
  async togglePlayPause() {
    if (!this.state.pageData || !this.state.pageData.sentences.length) {
      await this.extractActiveTabContent();
      if (!this.state.pageData || !this.state.pageData.sentences.length) return;
    }

    if (this.state.isPlaying) {
      this.pausePlayback();
    } else {
      this.startPlayback();
    }
  }

  /**
   * Démarre la lecture
   */
  startPlayback() {
    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.iconPlay.classList.add('hidden');
    this.iconPause.classList.remove('hidden');
    this.updateStatus('Lecture...');

    this.playSentence(this.state.currentSentenceIndex);
  }

  /**
   * Met en pause
   */
  pausePlayback() {
    this.state.isPlaying = false;
    this.state.isPaused = true;
    this.speechSessionId = (this.speechSessionId || 0) + 1; // Invalide immédiatement tout callback asynchrone

    this.iconPlay.classList.remove('hidden');
    this.iconPause.classList.add('hidden');
    this.updateStatus('En pause');

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
    }
    if (this.currentAudioSource) {
      try { this.currentAudioSource.stop(); } catch {}
    }
  }

  /**
   * Arrête totalement la lecture
   */
  stopPlayback() {
    this.pausePlayback();
    this.state.isPaused = false;
    this.state.currentSentenceIndex = 0;
    this.updateProgress();

    if (this.state.pageData?.sentences?.length) {
      this.currentSentenceDisplay.textContent = this.state.pageData.sentences[0];
    }

    this.clearPageHighlight();
    this.updateZenHighlight();
    this.updateStatus('Prêt');
  }

  /**
   * Lit la phrase à l'index donné
   */
  async playSentence(index) {
    if (!this.state.isPlaying) return;

    const sentences = this.state.pageData?.sentences || [];
    if (index >= sentences.length) {
      this.stopPlayback();
      this.updateStatus('Lecture terminée');
      return;
    }

    this.state.currentSentenceIndex = index;
    const sentence = sentences[index];

    // Mise à jour de l'affichage
    this.currentSentenceDisplay.textContent = sentence;
    this.updateProgress();
    this.highlightSentenceOnPage(sentence);
    this.updateZenHighlight();

    // Choix du moteur de lecture
    if (this.state.speechEngine === 'gemini' && this.gemini.hasKey()) {
      await this.playViaGeminiTTS(sentence);
    } else {
      this.playViaNativeSpeech(sentence);
    }
  }

  /**
   * Lecture via la synthèse vocale native du navigateur (Web Speech API)
   * Stable, sans quota d'API et sans boucle d'erreur de saut de phrase
   */
  playViaNativeSpeech(sentence) {
    if (!('speechSynthesis' in window)) {
      this.showToast("Votre navigateur ne supporte pas la synthèse vocale native.");
      this.stopPlayback();
      return;
    }

    // Incrémenter la session pour annuler tout événement 'onerror' ou 'onend' des phrases précédentes
    this.speechSessionId = (this.speechSessionId || 0) + 1;
    const currentSession = this.speechSessionId;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate = this.state.playbackRate;
    utterance.lang = 'fr-FR';

    // Appliquer la voix locale sélectionnée si disponible
    if (this.state.selectedNativeVoiceUri && this.nativeVoices) {
      const match = this.nativeVoices.find(v => v.voiceURI === this.state.selectedNativeVoiceUri);
      if (match) utterance.voice = match;
    }

    utterance.onend = () => {
      // Ignorer si cette phrase a été annulée ou si la session a changé
      if (this.speechSessionId !== currentSession) return;
      if (this.state.isPlaying) {
        this.playSentence(this.state.currentSentenceIndex + 1);
      }
    };

    utterance.onerror = (e) => {
      // Ignorer si la session n'est plus active
      if (this.speechSessionId !== currentSession) return;
      // Ne JAMAIS avancer en cas d'interruption ou d'annulation normale (évite la boucle de saut rapide)
      if (e.error === 'interrupted' || e.error === 'canceled') {
        return;
      }
      console.warn("Synthèse vocale native arrêtée:", e.error);
      this.pausePlayback();
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Lecture via Gemini 3.1 Flash TTS (avec bascule automatique en cas de Rate Limit)
   */
  async playViaGeminiTTS(sentence) {
    try {
      this.updateStatus('Génération voix IA...');
      const audioResult = await this.gemini.generateSpeechAudio(sentence, this.state.geminiVoice);

      if (!this.state.isPlaying) return; // Annulé entre-temps

      this.updateStatus('Lecture audio...');
      const blob = this.base64ToBlob(audioResult.base64, audioResult.mimeType);
      const audioUrl = URL.createObjectURL(blob);

      if (this.currentAudioElement) {
        this.currentAudioElement.pause();
      }

      const audio = new Audio(audioUrl);
      this.currentAudioElement = audio;
      audio.playbackRate = this.state.playbackRate;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (this.state.isPlaying) {
          this.playSentence(this.state.currentSentenceIndex + 1);
        }
      };

      audio.onerror = (err) => {
        console.warn("Erreur de lecture audio Gemini, bascule sur la voix native:", err);
        URL.revokeObjectURL(audioUrl);
        this.playViaNativeSpeech(sentence);
      };

      await audio.play();
    } catch (err) {
      console.warn("Échec Gemini TTS, bascule sur la voix native:", err.message);

      // Détection du dépassement de quota (Rate limit 429 de l'API gratuite Google AI Studio)
      const isRateLimit = err.message && (
        err.message.includes('Rate limit') ||
        err.message.includes('429') ||
        err.message.includes('quota') ||
        err.message.includes('ResourceExhausted')
      );

      if (isRateLimit) {
        this.showToast("Quota gratuit Gemini atteint (3 req/min). Bascule automatique sur la voix du navigateur pour continuer la lecture sans coupure.");
        // Basculer l'état pour que les phrases suivantes soient lues sans re-bloquer sur le quota
        this.state.speechEngine = 'native';
        this.updateEngineUI();
        const nativeRadio = document.querySelector('input[name="speechEngine"][value="native"]');
        if (nativeRadio) nativeRadio.checked = true;
      }

      // Lire la phrase en cours avec la voix du navigateur sans sauter
      this.playViaNativeSpeech(sentence);
    }
  }

  /**
   * Convertit une chaîne base64 en Blob audio
   */
  base64ToBlob(base64, mimeType = 'audio/wav') {
    const byteChars = atob(base64);
    const byteArrays = [];
    const sliceSize = 512;

    for (let offset = 0; offset < byteChars.length; offset += sliceSize) {
      const slice = byteChars.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }

    return new Blob(byteArrays, { type: mimeType });
  }

  /**
   * Phrase suivante
   */
  nextSentence() {
    const total = this.state.pageData?.sentences?.length || 0;
    if (this.state.currentSentenceIndex < total - 1) {
      this.jumpToSentence(this.state.currentSentenceIndex + 1);
    }
  }

  /**
   * Phrase précédente
   */
  previousSentence() {
    if (this.state.currentSentenceIndex > 0) {
      this.jumpToSentence(this.state.currentSentenceIndex - 1);
    }
  }

  /**
   * Saut direct à une phrase
   */
  jumpToSentence(index) {
    this.state.currentSentenceIndex = index;
    if (this.state.isPlaying) {
      this.pausePlayback();
      this.startPlayback();
    } else {
      const sentence = this.state.pageData?.sentences?.[index] || '';
      this.currentSentenceDisplay.textContent = sentence;
      this.updateProgress();
      this.updateZenHighlight();
      this.highlightSentenceOnPage(sentence);
    }
  }

  /**
   * Clic sur la barre de progression
   */
  handleProgressClick(event) {
    const rect = this.progressContainer.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));

    const total = this.state.pageData?.sentences?.length || 0;
    if (total === 0) return;

    const targetIndex = Math.floor(ratio * total);
    this.jumpToSentence(targetIndex);
  }

  /**
   * Mise à jour visuelle de la progression
   */
  updateProgress() {
    const total = this.state.pageData?.sentences?.length || 0;
    const current = total === 0 ? 0 : this.state.currentSentenceIndex + 1;
    const pct = total === 0 ? 0 : Math.round((current / total) * 100);

    this.progressFill.style.width = `${pct}%`;
    this.progressText.textContent = `${current} / ${total}`;
    this.progressPercentage.textContent = `${pct}%`;
  }

  /**
   * Surlignage de la phrase sur la page active (y compris dans les iframes)
   */
  async highlightSentenceOnPage(sentence) {
    if (!this.state.activeTabId) return;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: this.state.activeTabId, allFrames: true },
        func: (text) => {
          if (typeof window.__geminiHighlight === 'function') {
            window.__geminiHighlight(text);
          }
        },
        args: [sentence]
      });
    } catch {}
  }

  /**
   * Efface le surlignage sur la page (tous cadres)
   */
  async clearPageHighlight() {
    if (!this.state.activeTabId) return;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: this.state.activeTabId, allFrames: true },
        func: () => {
          if (typeof window.__geminiClearHighlight === 'function') {
            window.__geminiClearHighlight();
          }
        }
      });
    } catch {}
  }

  /**
   * Met à jour le surlignage dans l'onglet Lecture Zen
   */
  updateZenHighlight() {
    const spans = this.readerContentBody.querySelectorAll('.reader-sentence');
    spans.forEach(span => {
      const active = parseInt(span.dataset.index) === this.state.currentSentenceIndex;
      span.classList.toggle('active', active);
      if (active) {
        span.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  /**
   * Génération du résumé de la page
   */
  async handleGenerateSummary() {
    if (!this.state.pageData?.text) {
      alert("Aucun texte à résumer. Veuillez extraire une page.");
      return;
    }

    try {
      this.summaryLoader.classList.remove('hidden');
      this.summaryContainer.classList.add('hidden');
      this.summaryTypeBadge.textContent = "Synthèse & Points Clés";

      const summary = await this.gemini.generateSummary(this.state.pageData.text, this.state.pageData.title);

      this.summaryContentText.textContent = summary;
      this.summaryContainer.classList.remove('hidden');
    } catch (err) {
      alert(`Erreur résumé : ${err.message}`);
    } finally {
      this.summaryLoader.classList.add('hidden');
    }
  }

  /**
   * Vulgarisation / Simplification du texte
   */
  async handleSimplifyText() {
    if (!this.state.pageData?.text) {
      alert("Aucun texte à vulgariser.");
      return;
    }

    try {
      this.summaryLoader.classList.remove('hidden');
      this.summaryContainer.classList.add('hidden');
      this.summaryTypeBadge.textContent = "Explication Simplifiée";

      const simpleText = await this.gemini.simplifyText(this.state.pageData.text, this.state.pageData.title);

      this.summaryContentText.textContent = simpleText;
      this.summaryContainer.classList.remove('hidden');
    } catch (err) {
      alert(`Erreur : ${err.message}`);
    } finally {
      this.summaryLoader.classList.add('hidden');
    }
  }

  /**
   * Charger le résumé dans le lecteur vocal
   */
  handleListenSummary() {
    const text = this.summaryContentText.textContent.trim();
    if (!text) return;

    const regex = /[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g;
    const sentences = text.match(regex) || [text];

    this.setPageData({
      title: `Résumé : ${this.state.pageData?.title || 'Article'}`,
      text: text,
      paragraphs: text.split(/\n\s*\n/),
      sentences: sentences.map(s => s.trim()).filter(Boolean),
      wordCount: text.split(/\s+/).length,
      readingTimeMinutes: 1
    });

    this.switchTab('tab-audio');
    this.startPlayback();
  }

  /**
   * Envoi d'un message dans le chat assistant
   */
  async handleSendChatMessage() {
    const question = this.chatInput.value.trim();
    if (!question) return;

    if (!this.gemini.hasKey()) {
      this.switchTab('tab-settings');
      this.showToast("Veuillez d'abord configurer votre clé API Gemini dans les réglages.");
      return;
    }

    // Afficher la bulle utilisateur
    this.appendChatBubble(question, 'user');
    this.chatInput.value = '';

    // Enregistrer dans l'historique conversationnel
    this.chatHistory.push({ role: 'user', content: question });

    // Afficher bulle de chargement
    const loaderBubble = this.appendChatBubble("Gemini analyse et prépare la réponse...", 'assistant loading');

    try {
      const pageText = this.state.pageData?.text || '';
      const answer = await this.gemini.askQuestion(pageText, question, this.chatHistory);
      
      loaderBubble.innerHTML = this.formatMarkdown(answer);
      loaderBubble.classList.remove('loading');

      // Enregistrer la réponse dans l'historique conversationnel
      this.chatHistory.push({ role: 'assistant', content: answer });
    } catch (err) {
      console.error("Erreur chat assistant :", err);
      loaderBubble.textContent = `Erreur : ${err.message}`;
      loaderBubble.classList.remove('loading');
      loaderBubble.classList.add('error');
    }

    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  /**
   * Réinitialise l'historique de discussion
   */
  clearChatHistory() {
    this.chatHistory = [];
    this.chatContainer.innerHTML = `
      <div class="chat-bubble assistant">
        Bonjour ! Posez-moi n'importe quelle question sur le texte de cette page, demandez-moi d'expliquer une phrase complexe ou un terme, je vous répondrai avec plaisir.
      </div>
    `;
    this.showToast("Historique de discussion effacé.", 2500);
  }

  /**
   * Formate du markdown simple en HTML sécurisé
   */
  formatMarkdown(raw) {
    if (!raw) return '';
    // 1. Échappement HTML sécurisé
    const text = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 2. Formatage inline (code, gras, italique)
    const formatInline = (str) => {
      return str
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    };

    const lines = text.split('\n');
    let inList = null; // 'ul' ou 'ol'
    const output = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Titres markdown
      if (/^###\s+/.test(trimmed)) {
        if (inList) { output.push(`</${inList}>`); inList = null; }
        output.push(`<strong>${formatInline(trimmed.replace(/^###\s+/, ''))}</strong>`);
        continue;
      }
      if (/^##\s+/.test(trimmed)) {
        if (inList) { output.push(`</${inList}>`); inList = null; }
        output.push(`<strong style="font-size: 1.05em;">${formatInline(trimmed.replace(/^##\s+/, ''))}</strong>`);
        continue;
      }

      // Puces non ordonnées (* ou -)
      if (/^[*-]\s+/.test(trimmed)) {
        if (inList !== 'ul') {
          if (inList) output.push(`</${inList}>`);
          output.push('<ul>');
          inList = 'ul';
        }
        output.push(`<li>${formatInline(trimmed.replace(/^[*-]\s+/, ''))}</li>`);
        continue;
      }

      // Puces ordonnées (1. 2. etc)
      if (/^\d+\.\s+/.test(trimmed)) {
        if (inList !== 'ol') {
          if (inList) output.push(`</${inList}>`);
          output.push('<ol>');
          inList = 'ol';
        }
        output.push(`<li>${formatInline(trimmed.replace(/^\d+\.\s+/, ''))}</li>`);
        continue;
      }

      // Fin de liste si ligne normale
      if (inList) {
        output.push(`</${inList}>`);
        inList = null;
      }

      if (trimmed.length > 0) {
        output.push(`<p>${formatInline(line)}</p>`);
      }
    }

    if (inList) {
      output.push(`</${inList}>`);
    }

    return output.join('');
  }

  /**
   * Ajoute une bulle dans l'historique du chat
   */
  appendChatBubble(text, type) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type}`;
    bubble.textContent = text;
    this.chatContainer.appendChild(bubble);
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    return bubble;
  }

  /**
   * Afficher / masquer la clé API
   */
  toggleKeyVisibility() {
    const isPassword = this.inputApiKey.type === 'password';
    this.inputApiKey.type = isPassword ? 'text' : 'password';
    this.btnToggleKeyVisibility.textContent = isPassword ? '🔒' : '👁️';
  }

  /**
   * Enregistrer la clé API
   */
  async saveApiKey() {
    const key = this.inputApiKey.value.trim();
    this.gemini.setApiKey(key);
    await chrome.storage.local.set({ geminiApiKey: key });

    this.keyTestStatus.className = 'status-msg success';
    this.keyTestStatus.textContent = "Clé enregistrée avec succès.";
    this.apiKeyBanner.classList.toggle('hidden', Boolean(key));

    setTimeout(() => {
      this.keyTestStatus.textContent = '';
    }, 3000);
  }

  /**
   * Tester la validité de la clé API
   */
  async testApiKey() {
    const key = this.inputApiKey.value.trim();
    if (!key) {
      this.keyTestStatus.className = 'status-msg error';
      this.keyTestStatus.textContent = "Veuillez saisir une clé API.";
      return;
    }

    this.gemini.setApiKey(key);
    this.keyTestStatus.className = 'status-msg';
    this.keyTestStatus.textContent = "Test de connexion en cours...";

    try {
      await this.gemini.testConnection();
      this.keyTestStatus.className = 'status-msg success';
      this.keyTestStatus.textContent = "✅ Clé valide et connectée à Gemini !";
      await chrome.storage.local.set({ geminiApiKey: key });
      this.apiKeyBanner.classList.add('hidden');
    } catch (err) {
      this.keyTestStatus.className = 'status-msg error';
      this.keyTestStatus.textContent = `❌ ${err.message}`;
    }
  }

  /**
   * Test rapide d'un extrait de voix
   */
  async testVoiceSample() {
    const sample = "Bonjour ! Je suis la voix Gemini, prête à lire tous vos articles.";
    if (this.state.speechEngine === 'gemini' && this.gemini.hasKey()) {
      try {
        const audio = await this.gemini.generateSpeechAudio(sample, this.state.geminiVoice);
        const blob = this.base64ToBlob(audio.base64, audio.mimeType);
        const url = URL.createObjectURL(blob);
        const player = new Audio(url);
        player.play();
      } catch (err) {
        if (err.message && (err.message.includes('Rate limit') || err.message.includes('429'))) {
          this.showToast("⚠️ Quota gratuit Gemini atteint (3 requêtes/minute max). Patientez 45 secondes ou utilisez la voix locale du navigateur.");
        } else {
          this.showToast(`Erreur voix Gemini : ${err.message}`);
        }
      }
    } else {
      this.testNativeVoiceSample();
    }
  }
}

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  window.geminiReaderApp = new GeminiReaderApp();
});
