

# Plan: Corriger les pages 404 et la connexion Gmail

## Problemes identifies

### 1. Route `/control-center` manquante (404)
La sidebar contient un lien vers `/control-center` (Centre de Controle), le composant `ControlCenter` est importe dans `App.tsx`, mais **la route n'est pas declaree** dans les `<Routes>`. Resultat: 404 systematique.

### 2. Erreur 403 Google OAuth
L'erreur 403 lors de la connexion Gmail vient de la **configuration Google Cloud Console**, pas du code. Les tokens sont NULL dans la base. Le code backend fonctionne correctement (generation d'URL, echange de tokens, stockage chiffre).

**Actions requises dans Google Cloud Console** (par vous, pas par le code):
- Ajouter `teba.gaetan@gmail.com` comme **utilisateur test** dans l'ecran de consentement OAuth
- Verifier que l'API Gmail est **activee**
- Verifier que l'URI de redirection est exactement: `https://csysnvkvnoghhyqaxdkz.supabase.co/functions/v1/gmail-oauth`

---

## Modifications code

### Etape 1: Ajouter la route `/control-center` dans App.tsx

Ajouter la route manquante dans la section "Protected routes":

```typescript
<Route path="/control-center" element={<AuthGuard><ControlCenter /></AuthGuard>} />
```

**Fichier:** `src/App.tsx` - une seule ligne a ajouter apres la route Dashboard.

### Etape 2: Verifier les autres routes sidebar vs App.tsx

Toutes les autres routes de la sidebar (`/emails`, `/email-cleanup`, `/attachments`, `/suggestions`, `/incidents`, `/incidents-timeline`, `/journal`, `/nouveau`, `/factual-dossier`, `/events`, `/analysis-pipeline`, `/ia-auditeur`, `/ia-training`, `/swipe-training`, `/gmail-config`, `/admin`, `/tutorial`, `/legal-config`, `/legal-admin`) sont deja declarees dans App.tsx. Seule `/control-center` manque.

---

## Ce qui ne peut PAS etre corrige par le code

L'erreur **403 de Google** necessite votre intervention dans la Google Cloud Console:

1. Allez sur https://console.cloud.google.com/apis/credentials/consent
2. Section "Utilisateurs tests" → Ajoutez `teba.gaetan@gmail.com`
3. Verifiez dans la Bibliotheque d'APIs que "Gmail API" est activee
4. Dans les identifiants OAuth, verifiez que l'URI de redirection autorisee est: `https://csysnvkvnoghhyqaxdkz.supabase.co/functions/v1/gmail-oauth`

Une fois ces etapes faites, le bouton "Reconnecter Gmail" stockera les tokens et la synchronisation fonctionnera.

---

## Fichiers a modifier

1. `src/App.tsx` - Ajout de la route `/control-center`

## Resultat attendu

- Plus de 404 sur "Centre de Controle"
- Apres configuration Google Cloud Console: connexion Gmail fonctionnelle, tokens stockes, synchronisation et analyse des emails operationnelles

