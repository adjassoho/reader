# Gemini Reader - Extension Chrome de Lecture Intelligente

**Gemini Reader** est une extension pour Google Chrome (Manifest V3) conçue pour extraire, lire à haute voix, résumer et expliquer le contenu textuel de n'importe quelle page web grâce à l'intelligence artificielle de **Google Gemini**.

---

## 🌟 Fonctionnalités Principales

- 🎧 **Lecture Audio Expressive & Synchronisée** :
  - Écoute fluide avec les voix réalistes de **Gemini 3.1 Flash TTS** (voix *Kore*, *Puck*, *Zephyr*, *Fenrir*, etc.).
  - Repli immédiat sur la synthèse vocale native du navigateur (fonctionne hors-ligne et sans quota).
  - Surlignage de la phrase en cours sur la page web avec défilement automatique doux (*smooth scrolling*).
- 📖 **Mode Lecture Zen Épuré** :
  - Extraction intelligente du contenu principal (filtre les bannières, menus, publicités, popups de cookies).
  - Affichage propre dans le volet latéral avec taille de police ajustable.
  - Clic direct sur n'importe quelle phrase pour démarrer la lecture audio à cet endroit précis.
- ⚡ **Résumé Instantané & Synthèse** :
  - Génère en quelques secondes un résumé avec les 3 à 5 points clés essentiels via **Gemini 3.8 Flash**.
  - Bouton pour écouter directement le résumé audio.
- 🎓 **Vulgarisation & Explication Simple** :
  - Réécrit les textes complexes ou techniques de façon claire et accessible à tous.
- 💬 **Assistant Conversationnel Intégré** :
  - Posez n'importe quelle question sur l'article ouvert dans le volet latéral pour obtenir des réponses immédiates et sourcées.

---

## 🚀 Installation dans Google Chrome

1. Ouvrez Google Chrome et accédez à l'adresse suivante :
   ```text
   chrome://extensions
   ```
2. Activez le **Mode développeur** en haut à droite de la page.
3. Cliquez sur le bouton **Charger l'extension non empaquetée** (*Load unpacked*).
4. Sélectionnez le dossier du projet :
   ```text
   /home/ff/Public/Reader
   ```
5. L'icône de **Gemini Reader** apparaît dans votre barre d'extensions ! Épinglez-la pour un accès facile.

---

## 🔑 Configuration de la Clé API Gemini

Pour utiliser la synthèse vocale Gemini TTS, les résumés et l'assistant Q&A :
1. Obtenez une clé API gratuite sur [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Ouvrez l'extension en cliquant sur son icône (le volet latéral s'ouvre).
3. Rendez-vous dans l'onglet **Réglages (⚙️)**.
4. Collez votre clé API dans le champ prévu et cliquez sur **Tester la clé** puis **Enregistrer**.

> **Note :** Si vous n'avez pas de clé API, vous pouvez toujours utiliser le lecteur avec la **synthèse vocale locale du navigateur** (gratuite et instantanée).

---

## 🧪 Tester l'extension en local

Un fichier d'exemple est fourni dans le projet pour tester directement les fonctionnalités :
1. Ouvrez le fichier [test-article.html](file:///home/ff/Public/Reader/test-article.html) dans Google Chrome.
2. Cliquez sur l'icône Gemini Reader (ou utilisez le raccourci clavier `Alt+R`).
3. Le texte de l'article est extrait automatiquement dans le volet latéral.
4. Cliquez sur **Lecture (▶)** pour lancer la lecture vocale.
5. Explorez les onglets **Lecture Zen**, **Résumé IA** et **Assistant**.

---

## 📂 Architecture des Fichiers

```text
├── manifest.json            # Configuration Manifest V3 de l'extension
├── background.js            # Service worker d'arrière-plan (gestion Side Panel et menus contextuels)
├── content/
│   ├── extractor.js         # Extraction propre du texte et filtrage du bruit HTML
│   └── highlighter.js       # Surlignage de la phrase active sur la page web
├── sidepanel/
│   ├── sidepanel.html       # Interface HTML du panneau latéral
│   ├── sidepanel.css        # Styles modernes et adaptatifs (Dark/Light mode)
│   ├── sidepanel.js         # Orchestration de l'interface et du lecteur audio
│   └── gemini-client.js     # Client de communication avec l'API Google Gemini
├── icons/                   # Icônes de l'extension (16x16, 48x48, 128x128 PNG)
├── generate_icons.py        # Script de génération des icônes
├── test-article.html        # Page web riche pour tester l'extension
├── CHROMEWEBSTORE.md        # Fiche descriptive pour publication sur le Chrome Web Store
└── README.md                # Documentation du projet
```

---

## 🛡️ Respect de la Vie Privée

- Votre clé API est stockée uniquement dans le stockage local de votre navigateur (`chrome.storage.local`).
- Aucun serveur intermédiaire ou outil tiers de télémétrie n'est utilisé.
- Les requêtes sont transmises exclusivement aux serveurs sécurisés de Google Gemini.
