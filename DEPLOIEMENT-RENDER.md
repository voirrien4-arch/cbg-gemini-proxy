# Déployer le proxy Gemini sur Render (gratuit)

## 1. Mettre le code sur GitHub
1. Crée un dépôt GitHub (public ou privé, peu importe).
2. Ajoute-y le contenu de ce dossier `cbg-gemini-proxy/` (server.js, package.json,
   .gitignore — PAS de fichier .env, il ne doit jamais être commité).

## 2. Créer le service sur Render
1. Va sur https://render.com et crée un compte (gratuit).
2. Clique sur **New +** → **Web Service**.
3. Connecte ton dépôt GitHub contenant `cbg-gemini-proxy`.
4. Renseigne :
   - **Name** : `cbg-gemini-proxy` (ou ce que tu veux)
   - **Region** : la plus proche de toi
   - **Branch** : main
   - **Root Directory** : `cbg-gemini-proxy` (si le dossier est dans un repo plus large)
   - **Runtime** : Node
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Instance Type** : Free

## 3. Ajouter la clé API en secret
1. Dans les paramètres du service → onglet **Environment**.
2. Ajoute les variables :
   - `GEMINI_API_KEY` = ta clé Gemini (jamais visible côté site)
   - `GEMINI_MODEL` = `gemini-2.0-flash` (ou le modèle que tu préfères)
   - `ALLOWED_ORIGINS` = l'URL de ton site (ex: `https://cbg-guinee.com`) —
     tu peux mettre `*` temporairement pour tester, mais restreins-le avant
     la présentation à ton client.
3. Clique sur **Save Changes** → Render redéploie automatiquement.

## 4. Récupérer l'URL du service
Une fois déployé, Render te donne une URL du type :
`https://cbg-gemini-proxy.onrender.com`

Teste-la dans le navigateur : `https://cbg-gemini-proxy.onrender.com/`
doit répondre `{"status":"ok","service":"cbg-gemini-proxy"}`.

## 5. Brancher le site dessus
Dans `gemini.js` du site, remplace :
```js
endpoint: '/api/ai',
```
par l'URL complète de ton service Render :
```js
endpoint: 'https://cbg-gemini-proxy.onrender.com/api/ai',
```

## ⚠️ Notes importantes
- **Plan gratuit Render** : le service "s'endort" après 15 min d'inactivité et
  met ~30-50 secondes à redémarrer au premier appel. Pour ta démo, ouvre le
  chat CBG AI et pose une première question ~1 minute avant que ton client
  arrive, pour que le service soit déjà "réveillé".
- **Révocation de la clé** : après la présentation, régénère/révoque la clé
  directement dans Google AI Studio (https://aistudio.google.com/apikey).
  Tu peux aussi juste supprimer le service Render si tu ne comptes plus
  l'utiliser.
- **Ne mets jamais** la clé dans `gemini.js`, dans `index.html`, ou dans un
  fichier commité sur GitHub — même dans un commit "temporaire" (l'historique
  Git garde tout, y compris après suppression).
