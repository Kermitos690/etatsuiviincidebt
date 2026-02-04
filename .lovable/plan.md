
Objectif: réparer la connexion Gmail (écran /gmail-config) qui aboutit à une page Google “403. That’s an error. You do not have access to this page”.

## Ce que j’ai constaté (preuves)
1) L’app appelle bien la fonction backend `gmail-oauth` pour obtenir l’URL Google:
- Réseau: `POST /functions/v1/gmail-oauth` avec `{ action: "get-auth-url" }` → 200.

2) L’URL retournée est anormale: le paramètre `client_id` contient visiblement du JSON injecté (on voit `","project_id":"new-incident-2026` dans la valeur), ce qui casse la requête vers Google.
- Extrait réseau (réponse):  
  `...client_id=5199...apps.googleusercontent.com\",\"project_id\":\"new-incident-2026&redirect_uri=...`

3) Côté backend, `gmail-oauth` construit l’URL avec `client_id=${GOOGLE_CLIENT_ID}` sans `encodeURIComponent()`.  
Donc si le secret contient des guillemets/virgules/JSON, ça “pollue” l’URL finale.

4) Les logs backend ne montrent aucun “callback” (pas d’échange de code contre tokens), ce qui confirme que ça bloque avant de revenir sur notre callback.

## Cause racine la plus probable
- Le secret backend `GOOGLE_CLIENT_ID` (et possiblement `GOOGLE_CLIENT_SECRET`) a été rempli avec un JSON complet (ou une chaîne contenant plusieurs champs), au lieu d’une valeur simple.
- Et même si le secret était correct, le fait de ne pas encoder `client_id` est un bug de robustesse/sécurité (risque d’URL invalide dès qu’il y a un caractère inattendu).

## Stratégie de correction (robuste, “anti-erreur de copie”)
### A) Corriger la génération de l’URL dans `gmail-oauth`
1) Sanitation + parsing du secret:
   - Ajouter une fonction utilitaire (idéalement dans `_shared/`) qui:
     - `trim()`
     - enlève d’éventuels guillemets autour (`"..."`)
     - si la valeur “ressemble” à du JSON, tente `JSON.parse` et extrait:
       - `client_id` / `client_secret` au top-level
       - ou `web.client_id` / `web.client_secret` (format Google fréquent)
       - ou `installed.*` (autre format fréquent)
     - sinon retourne la valeur brute nettoyée.
2) Encoder systématiquement les paramètres URL:
   - `client_id`, `redirect_uri`, `scope`, `state` doivent tous être `encodeURIComponent(...)`.
   - Aujourd’hui `redirect_uri/scope/state` le sont, mais pas `client_id`.
3) Validation explicite avant de répondre:
   - Si `client_id` ne matche pas un format attendu (ex: se termine par `.apps.googleusercontent.com`), répondre:
     - HTTP 200 avec `{ success:false, code:"CONFIG_ERROR", message:"Client ID invalide", suggestion:"..." }`
     - (évite un “Load failed” opaque côté navigateur)
4) Étendre l’action `diagnose`:
   - Ajouter des champs non-sensibles, par ex:
     - `clientIdLooksValid: boolean`
     - `clientIdHint: "ok" | "looks_like_json" | "has_quotes" | "wrong_format"`
   - Sans jamais renvoyer la valeur du secret.

### B) Appliquer la même sanitation dans `gmail-sync`
Pourquoi: `gmail-sync` utilise aussi `GOOGLE_CLIENT_ID/SECRET` pour le refresh token. Si le secret est “pollué”, la synchro cassera plus tard même si l’OAuth passait.
- Réutiliser le même helper de parsing/validation.
- Si invalide → renvoyer `{ success:false, code:"CONFIG_ERROR", ... }` avec message clair.

### C) Améliorer le feedback UI dans `GmailConfig.tsx`
1) Dans `handleGoogleAuth()`:
   - Si la fonction retourne `{ success:false }`, afficher un panneau d’erreur (en utilisant l’état `oauthError` déjà présent) au lieu d’un toast générique.
   - Proposer directement:
     - “Ouvre ‘Diagnostiquer la connexion Gmail’”
     - “Copier les valeurs (origines/redirect URIs)”
2) Optionnel mais utile:
   - Ajouter un texte d’aide si l’utilisateur est en prévisualisation:
     - il faut autoriser aussi l’origine de prévisualisation dans Google Cloud, pas seulement l’URL publique.

## Correction de configuration (côté Google / secrets)
Même avec le code robuste, il faut que les secrets soient cohérents:
1) Remettre `GOOGLE_CLIENT_ID` à une valeur simple:
   - uniquement la chaîne du type `xxxxx-xxxx.apps.googleusercontent.com`
   - pas de JSON, pas de guillemets additionnels.
2) Remettre `GOOGLE_CLIENT_SECRET`:
   - uniquement le secret, valeur simple.
3) Vérifier Google Cloud:
   - “Authorized JavaScript origins”: ajouter l’origine affichée par le panneau diagnostic (si tu utilises l’URL publique ET la preview, ajouter les deux).
   - “Authorized redirect URIs”: doit contenir exactement l’URI Gmail affichée (celle qui finit par `/functions/v1/gmail-oauth`).
   - Si l’app OAuth est en mode “Testing”: ajouter ton email dans “Test users”.

## Étapes d’implémentation (séquencement)
1) Lire/ajuster `supabase/functions/gmail-oauth/index.ts`:
   - ajouter parsing/validation
   - encoder `client_id`
   - enrichir `diagnose`
2) Lire/ajuster `supabase/functions/gmail-sync/index.ts`:
   - réutiliser parsing/validation
3) Ajuster `src/pages/GmailConfig.tsx`:
   - gérer proprement `{ success:false, code:"CONFIG_ERROR" }`
4) Mettre à jour les secrets `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` (nouvelles valeurs propres).
5) Tests end-to-end (voir ci-dessous).

## Checklist de tests (end-to-end)
1) Sur /gmail-config:
   - Cliquer “Diagnostiquer la connexion Gmail” → tout au vert + indications “clientIdLooksValid”.
2) Cliquer “Connecter Gmail”:
   - Vérifier que l’URL Google ouverte contient un `client_id=` propre (pas de `project_id`, pas de guillemets).
   - Consentement → retour app avec `connected=true&email=...`.
3) Lancer une synchro:
   - `gmail-sync` démarre, `sync-status` progresse, pas d’erreur refresh token.
4) Refaire le test sur mobile (Safari/Chrome):
   - mode popup bloqué → fallback onglet fonctionne.
5) Optionnel: tester depuis l’URL publique et depuis la preview (si tu utilises les deux).

## Risques / points d’attention
- Ne jamais afficher les secrets dans la UI ou dans les logs (on se limite à des indices “valide / invalide”).
- Garder `verify_jwt=false` sur `gmail-oauth` (déjà le cas) pour permettre le callback Google public.
- La correction `encodeURIComponent(client_id)` est un “must” même si le secret est correct.

Résultat attendu: plus de page Google 403, et un message clair dans l’app si les identifiants sont mal copiés/collés.
