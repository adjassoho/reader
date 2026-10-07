# Chrome Web Store Listing — Gemini Reader

> Last Updated: 2026-10-03

## Store Listing

**Extension Name** [REQUIRED]
Gemini Reader - Lecteur IA de Page Web

**Short Description** [REQUIRED]
Lisez, écoutez et comprenez n'importe quelle page web grâce à la synthèse vocale et à l'intelligence artificielle de Google Gemini.

**Detailed Description** [REQUIRED]
Transformez votre façon de lire et de parcourir le web avec Gemini Reader, votre compagnon de lecture intelligent propulsé par l'IA de Google Gemini.

FONCTIONNALITÉS CLÉS

1. Lecture Audio Naturelle et Expressive
Écoutez n'importe quel article ou document web grâce à une voix fluide et naturelle. L'extension surligne en temps réel la phrase en cours de lecture et fait défiler la page automatiquement pour vous permettre de suivre le fil sans effort.

2. Mode Lecture Zen Épuré
Débarrassez-vous des distractions visuelles, publicités et bannières intrusives. Gemini Reader extrait le cœur du texte pour vous offrir un affichage propre, reposant et ajustable (taille de texte personnalisable).

3. Synthèse et Résumés Instantanés
Vous manquez de temps ? Obtenez en un clic un résumé structuré avec les 3 à 5 points clés majeurs de l'article grâce au modèle Gemini 3.8 Flash, puis écoutez directement ce résumé.

4. Vulgarisation et Explications Simples
Un article technique ou juridique trop difficile à appréhender ? Activez le mode Vulgarisation pour recevoir une version limpide, pédagogique et sans jargon.

5. Assistant Conversationnel Intégré
Posez toutes vos questions sur le texte directement dans le panneau latéral. Gemini analyse l'article ouvert et vous répond avec précision et contexte.

COMMENT L'UTILISER

1. Cliquez sur l'icône de l'extension pour ouvrir le panneau latéral.
2. L'article est automatiquement extrait et prêt à être lu.
3. Appuyez sur Lecture pour lancer l'audio, ou consultez l'onglet Résumé pour une synthèse rapide.
4. Renseignez votre propre clé API Gemini (gratuite sur Google AI Studio) dans les Paramètres pour activer les fonctionnalités IA avancées.

CONFIDENTIALITÉ ET SÉCURITÉ

Vos données restent votre propriété. Votre clé API et vos préférences sont conservées localement dans votre navigateur et ne transitent par aucun serveur intermédiaire. Les requêtes de lecture et de résumé sont envoyées directement et uniquement aux serveurs sécurisés de Google Gemini.

**Category** [REQUIRED]
Accessibility

**Single Purpose** [REQUIRED]
Permet aux utilisateurs d'écouter, résumer et comprendre le contenu textuel des pages web grâce à la synthèse vocale et à l'IA.

**Primary Language** [REQUIRED]
French

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|---|---|---|---|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icons/icon-128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | |

### Screenshot Notes
- Capture 1 : Le panneau latéral ouvert avec le lecteur audio en marche et la phrase surlignée en jaune sur la page web.
- Capture 2 : L'onglet Résumé IA affichant les points clés et l'option "Écouter ce résumé".
- Capture 3 : L'assistant conversationnel répondant à une question posée sur l'article.

## Permissions Justification

| Permission | Type | Justification |
|---|---|---|
| `sidePanel` | permissions | Permet d'afficher l'interface de lecture ergonomique dans le volet latéral Chrome pour lire et écouter un article sans masquer la page web. |
| `storage` | permissions | Permet de sauvegarder localement la clé API Gemini de l'utilisateur, sa vitesse de lecture préférée et ses choix de voix. |
| `tabs` | permissions | Utilisé pour identifier l'onglet web actif et injecter le module d'extraction textuelle lorsque l'utilisateur demande la lecture. |
| `scripting` | permissions | Nécessaire pour analyser le DOM de la page ouverte, filtrer les publicités et extraire le texte de l'article pour la lecture vocale. |
| `contextMenus` | permissions | Permet à l'utilisateur de faire un clic droit sur un texte sélectionné pour l'écouter instantanément avec Gemini Reader. |
| `<all_urls>` | host_permissions | Permet à l'extension d'extraire le contenu textuel et de surligner les phrases sur n'importe quel site web d'actualité, de documentation ou de blog que l'utilisateur consulte. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|---|---|---|---|---|
| Personally identifiable info | No | No | N/A | No |
| Health info | No | No | N/A | No |
| Financial info | No | No | N/A | No |
| Authentication info (Clé API) | Yes (local) | Transmis uniquement à Google Gemini | Authentification de l'utilisateur auprès de l'API Google | Non partagé avec des tiers |
| Personal communications | No | No | N/A | No |
| Location | No | No | N/A | No |
| Web history | No | No | N/A | No |
| User activity | No | No | N/A | No |
| Website content | Yes (local) | Transmis à Google Gemini si l'utilisateur demande un résumé/audio | Traitement du texte par l'IA pour générer le résumé ou la voix | Non vendu ni partagé à d'autres tiers |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Version History

| Version | Date | Changes | Status |
|---|---|---|---|
| 1.0.0 | 2026-10-03 | Lancement initial : lecteur audio hybride (Gemini TTS & local), mode Zen, résumé IA, vulgarisation et assistant Q&A. | Draft |
