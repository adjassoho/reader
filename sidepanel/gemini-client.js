/**
 * Client pour l'API Google Gemini
 * Exploite gemini-3.8-flash et gemini-3.5-flash-lite avec bascule automatique intelligente
 * en cas de surcharge temporaire ("high demand"), et gemini-3.1-flash-tts-preview pour l'audio.
 */

export class GeminiClient {
  constructor(apiKey = '') {
    this.apiKey = apiKey ? apiKey.trim() : '';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/interactions';
    this.preferredModel = 'auto'; // 'auto', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'
    this.ttsModel = 'gemini-3.1-flash-tts-preview';
    
    // Ordre de priorité des modèles de texte
    this.defaultModelList = [
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite'
    ];
  }

  setApiKey(key) {
    this.apiKey = key ? key.trim() : '';
  }

  hasKey() {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  setPreferredModel(model) {
    this.preferredModel = model || 'auto';
  }

  /**
   * Vérifie la validité de la clé API avec un appel minimal résilient
   */
  async testConnection() {
    if (!this.hasKey()) {
      throw new Error("Clé API absente. Veuillez configurer votre clé dans les paramètres.");
    }

    try {
      const responseText = await this._generateText("Bonjour, réponds simplement par 'OK' en un mot.", { maxRetries: 2 });
      return Boolean(responseText);
    } catch (err) {
      throw new Error(`Échec de connexion : ${err.message}`);
    }
  }

  /**
   * Génère un résumé synthétique et structuré de l'article
   */
  async generateSummary(text, title = '') {
    if (!this.hasKey()) {
      throw new Error("Veuillez renseigner votre clé API Gemini pour générer le résumé.");
    }

    const prompt = `Tu es un assistant de lecture expert. Analyse l'article suivant et fournis :
1. Un résumé concis en 3-4 phrases (l'idée principale).
2. 3 à 5 points clés essentiels à retenir (sous forme de puces).
3. Le public ou l'application concrète concernée.

Sois direct, clair et captivant.

Titre : ${title || 'Sans titre'}
Texte de la page :
${(text || '').slice(0, 30000)}`;

    return await this._generateText(prompt);
  }

  /**
   * Simplifie le texte pour le rendre facile à comprendre (vulgarisation)
   */
  async simplifyText(text, title = '') {
    if (!this.hasKey()) {
      throw new Error("Clé API Gemini requise.");
    }

    const prompt = `Tu es un vulgarisateur scientifique et pédagogique d'exception. 
Prends le texte suivant et réécris-le avec des mots simples, des métaphores parlantes et un style accessible à tous, sans jargon complexe.

Titre : ${title || ''}
Texte :
${(text || '').slice(0, 25000)}`;

    return await this._generateText(prompt);
  }

  /**
   * Répond à une question de l'utilisateur (avec historique et contexte de page)
   */
  async askQuestion(articleText, question, history = []) {
    if (!this.hasKey()) {
      throw new Error("Clé API Gemini requise. Veuillez renseigner votre clé dans les réglages.");
    }

    let contextSection = '';
    if (articleText && articleText.trim().length > 15) {
      contextSection = `
Voici le contexte textuel de la page web ou du cours que l'utilisateur consulte :
---
${articleText.slice(0, 30000)}
---
`;
    }

    // Historique conversationnel récent
    let historySection = '';
    if (Array.isArray(history) && history.length > 0) {
      const recent = history.slice(-6).map(h => `${h.role === 'user' ? 'Utilisateur' : 'Assistant'} : ${h.content}`).join('\n');
      historySection = `
Historique récent de notre échange :
${recent}
`;
    }

    const prompt = `Tu es "Gemini Reader", un assistant de lecture et d'apprentissage bienveillant, pédagogique et rigoureux.
Ton objectif est d'aider l'utilisateur à comprendre, analyser, contextualiser et approfondir ce qu'il lit.
${contextSection}
${historySection}
Instructions pour ta réponse :
1. Si l'utilisateur demande d'expliquer une phrase, un terme technique ou une notion (par exemple les biais dans les données, la discrimination algorithmique, l'IA générale, etc.), fournis une explication limpide, vivante et facile à appréhender, avec un exemple concret du monde réel si utile.
2. Si sa question porte sur le texte fourni, réponds en t'appuyant fidèlement sur celui-ci.
3. Si la question dépasse le cadre du texte ou s'il n'y a pas de texte extrait, réponds quand même avec toute ton expertise pour éclairer l'utilisateur.
4. Structure ta réponse avec des paragraphes aérés et des mises en valeur en gras pour une lecture agréable. Réponds en français.

Question de l'utilisateur :
${question}`;

    return await this._generateText(prompt);
  }

  /**
   * Génère l'audio de la phrase via gemini-3.1-flash-tts-preview
   */
  async generateSpeechAudio(text, voice = 'Kore') {
    if (!this.hasKey()) {
      throw new Error("Clé API requise pour la voix Gemini TTS.");
    }

    const payload = {
      model: this.ttsModel,
      input: text,
      response_format: { type: 'audio' },
      generation_config: {
        speech_config: [
          { voice: voice || 'Kore' }
        ]
      }
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Erreur TTS (${response.status})`);
    }

    const data = await response.json();
    return this._extractAudioFromResponse(data);
  }

  /**
   * Appel de génération de texte avec bascule intelligente multi-modèles
   * (Évite les blocages 503 / "high demand" fréquents sur les modèles individuels)
   */
  async _generateText(prompt, options = {}) {
    // Déterminer la liste ordonnée des modèles à tenter
    let modelsToTry = [];
    if (this.preferredModel && this.preferredModel !== 'auto') {
      modelsToTry = [this.preferredModel, ...this.defaultModelList.filter(m => m !== this.preferredModel)];
    } else {
      modelsToTry = [...this.defaultModelList];
    }

    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const payload = {
          model: model,
          input: prompt,
          generation_config: {
            temperature: options.temperature || 0.4
          }
        };

        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${response.status}`;

          // Vérifier si l'erreur est une surcharge temporaire du modèle (503, 429 high demand)
          const isOverloaded = response.status === 503 ||
            response.status === 429 ||
            errMsg.includes('high demand') ||
            errMsg.includes('spikes in demand') ||
            errMsg.includes('ResourceExhausted') ||
            errMsg.includes('overloaded') ||
            errMsg.includes('temporarily unavailable');

          if (isOverloaded) {
            console.warn(`Modèle ${model} temporairement indisponible (${errMsg}). Bascule automatique sur un modèle de secours...`);
            lastError = new Error(errMsg);
            continue; // Tenter le modèle suivant de la liste
          }

          // Si c'est une erreur définitive (ex: clé invalide 400/403), ne pas retenter
          throw new Error(errMsg);
        }

        const data = await response.json();
        const text = this._extractTextFromResponse(data);
        if (text) {
          return text;
        }
      } catch (err) {
        lastError = err;
        // Si c'est une erreur de surcharge, passer au modèle suivant
        if (err.message && (
          err.message.includes('high demand') ||
          err.message.includes('spikes in demand') ||
          err.message.includes('503') ||
          err.message.includes('overloaded')
        )) {
          continue;
        }
        // Sinon propager l'erreur (ex: clé API invalide)
        if (err.message && (err.message.includes('API_KEY_INVALID') || err.message.includes('403'))) {
          throw err;
        }
      }
    }

    throw lastError || new Error("Les serveurs Gemini sont temporairement surchargés. Veuillez réessayer dans quelques instants.");
  }

  /**
   * Extraction du texte d'une réponse de l'API Interactions
   */
  _extractTextFromResponse(data) {
    if (!data) return '';

    if (typeof data.output_text === 'string' && data.output_text.trim()) {
      return data.output_text.trim();
    }

    if (Array.isArray(data.steps)) {
      for (const step of data.steps) {
        if (step.type === 'model_output' && Array.isArray(step.content)) {
          const textPart = step.content.find(c => c.type === 'text' || typeof c.text === 'string');
          if (textPart && textPart.text) {
            return textPart.text.trim();
          }
        }
      }
    }

    return '';
  }

  /**
   * Extrait et convertit les données audio de la réponse Gemini
   */
  _extractAudioFromResponse(data) {
    if (data.output_audio && data.output_audio.data) {
      return {
        base64: data.output_audio.data,
        mimeType: data.output_audio.mime_type || 'audio/wav'
      };
    }

    if (Array.isArray(data.steps)) {
      for (const step of data.steps) {
        if (step.type === 'model_output' && Array.isArray(step.content)) {
          const audioPart = step.content.find(c => c.type === 'audio' || c.data);
          if (audioPart) {
            return {
              base64: audioPart.data,
              mimeType: audioPart.mime_type || 'audio/wav'
            };
          }
        }
      }
    }

    throw new Error("Aucune donnée audio retournée par le modèle Gemini TTS.");
  }
}
