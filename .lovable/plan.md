
# Plan: Corriger la synchronisation Gmail incomplete

## Diagnostic

**Probleme 1 -- Aucune synchro depuis le 1er janvier 2026:**
Les identifiants Google etaient corrompus (JSON dans le secret). C'est repare maintenant, mais aucune synchro n'a tourne depuis.

**Probleme 2 -- Seulement 155 emails recuperes (au lieu de milliers):**
Le mode "filtered" construit une requete Gmail API qui combine 52 domaines ET 81 mots-cles. Gmail exige que les DEUX correspondent (condition AND). Resultat: la plupart des emails sont exclus cote API avant meme d'etre telecharges.

Exemple de la requete generee:
```text
(from:*@Hetsl.ch OR from:*@Eesp.ch OR ... 50 autres)
("urgent" OR "réponse" OR ... 80 autres)
```
Un email de `Hetsl.ch` dont le sujet ne contient aucun des 81 mots-cles sera **ignore**.

**Probleme 3 -- Erreur sur le bouton "Analyser les emails" (onglet Nettoyage):**
Probablement un appel backend qui echoue (a investiguer dans les logs).

---

## Corrections proposees

### 1. Changer la logique de filtrage: OR au lieu de AND

**Fichier:** `supabase/functions/gmail-sync/index.ts` (lignes 912-927)

Actuellement, la requete Gmail API combine domaines ET mots-cles. Changer pour une logique OR:
- Si le domaine correspond OU si un mot-cle correspond, l'email est recupere.
- Cela evitera d'exclure des emails pertinents.

```text
Avant: (domaines) ET (mots-cles)  --> tres restrictif
Apres: (domaines) OU (mots-cles)  --> capture tous les emails pertinents
```

### 2. Gerer les requetes trop longues (split en pages)

Gmail API a une limite sur la longueur des requetes. Avec 52 domaines + 81 mots-cles, la requete peut depasser cette limite.

**Solution:** Si la requete depasse ~1000 caracteres:
- Telecharger TOUS les emails (sans filtre API)
- Appliquer les filtres localement dans `processEmailsInBackground` (deja en place aux lignes 498-515)

Cela garantit qu'aucun email pertinent n'est perdu.

### 3. Ajouter un filtre de date automatique

Les 148 emails en base remontent a 2022. Pas besoin de re-telecharger les anciens.

**Solution:** Lire la date du dernier email en base et passer `after:YYYY/MM/DD` a la requete Gmail API. Cela accelere la synchro et evite les doublons.

### 4. Corriger le bouton "Analyser les emails" (Nettoyage)

**Fichier:** `src/pages/EmailCleanup.tsx`

Investiguer et corriger l'erreur affichee. Probablement un appel a `batch-analyze-emails` ou `cleanup-emails` qui echoue.

---

## Details techniques

### Modification 1: gmail-sync -- logique OR + requete adaptative

```typescript
// Ligne ~922 de gmail-sync/index.ts
// AVANT:
query = [domainQuery, keywordQuery].filter(Boolean).join(' ');

// APRES:
// Si les deux filtres existent, utiliser OR (pas AND)
if (domainQuery && keywordQuery) {
  const combinedQuery = `${domainQuery} OR ${keywordQuery}`;
  // Si la requete est trop longue pour l'API Gmail, 
  // ne pas filtrer cote API et filtrer localement
  if (combinedQuery.length > 1000) {
    query = ''; // Pas de filtre API -- filtrage local
    console.log('Query trop longue, filtrage local active');
  } else {
    query = combinedQuery;
  }
} else {
  query = domainQuery || keywordQuery || '';
}
```

### Modification 2: gmail-sync -- date "after" automatique

```typescript
// Avant de construire la requete, chercher le dernier email
const { data: latestEmail } = await supabase
  .from('emails')
  .select('received_at')
  .eq('user_id', user.id)
  .order('received_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (latestEmail?.received_at && !afterDate) {
  const lastDate = new Date(latestEmail.received_at);
  // Remonter d'1 jour pour couvrir les chevauchements
  lastDate.setDate(lastDate.getDate() - 1);
  afterDate = `${lastDate.getFullYear()}/${String(lastDate.getMonth()+1).padStart(2,'0')}/${String(lastDate.getDate()).padStart(2,'0')}`;
  console.log(`Auto after date: ${afterDate}`);
}
```

### Modification 3: EmailCleanup -- corriger l'erreur d'analyse

Verifier l'appel backend dans `EmailCleanup.tsx` et ajouter une gestion d'erreur appropriee.

---

## Fichiers a modifier

1. `supabase/functions/gmail-sync/index.ts` -- logique OR + auto-date + requete adaptative
2. `src/pages/EmailCleanup.tsx` -- corriger l'erreur "Analyser les emails"

## Resultat attendu

- La prochaine synchro recuperera tous les emails depuis le 30 decembre 2025 (dernier email en base)
- Les filtres domaines/mots-cles seront appliques en mode OR (plus permissif)
- Si la requete est trop longue, le filtrage sera fait localement (aucun email pertinent perdu)
- Le bouton "Analyser les emails" fonctionnera sans erreur
