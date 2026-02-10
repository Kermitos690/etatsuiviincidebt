
# Plan: Faire fonctionner la recuperation des emails Gmail

## Probleme identifie

La base de donnees montre que les **tokens Gmail sont vides** (access_token_enc = NULL, refresh_token_enc = NULL, token_nonce = NULL). L'application affiche "Gmail connecte" car une ligne existe dans la configuration avec votre email, mais sans tokens valides, aucune synchronisation ne peut s'effectuer.

Le log backend confirme:
```
ERROR No access token available for user d866baf5-...
```

La connexion Google actuelle utilise le systeme d'authentification integre de Lovable Cloud, qui ne demande **pas** les permissions Gmail. Il faut une connexion Google **separee** qui demande explicitement l'acces a vos emails.

---

## Solution en 3 etapes

### Etape 1: Corriger la detection de connexion Gmail

**Fichier:** `src/pages/GmailConfig.tsx`

Actuellement, la page Gmail affiche "Connecte" des qu'une ligne de configuration existe. Il faut verifier que les tokens sont reellement presents.

- Modifier le chargement de la configuration pour utiliser l'action `get-config` du backend (qui retourne un champ `connected` base sur la presence reelle des tokens)
- Si `connected = false` malgre une configuration existante, afficher un message clair: "Reconnexion Gmail necessaire"

### Etape 2: Reparer le flux de connexion Gmail

**Fichier:** `src/pages/GmailConfig.tsx`

Le bouton "Connecter Gmail" sur la page de configuration utilise l'action `get-auth-url` du backend pour obtenir une URL Google avec les bons scopes (gmail.readonly). Ce flux fonctionne correctement dans le backend mais:

- S'assurer que le bouton de connexion est bien visible et fonctionnel quand les tokens sont absents
- Ajouter un bouton "Reconnecter Gmail" visible en haut de page quand la configuration existe mais que les tokens manquent
- Apres une connexion reussie via le callback OAuth, verifier que les tokens sont bien stockes

### Etape 3: Ajouter un flux de reconnexion rapide

**Fichier:** `src/pages/GmailConfig.tsx` et `src/pages/AnalysisPipeline.tsx`

Quand le pipeline detecte "Gmail non connecte", ajouter un lien direct vers la page de configuration Gmail avec un message explicatif.

---

## Details techniques

### Modification 1: GmailConfig.tsx -- detection fiable

```typescript
// Au chargement, appeler l'action get-config du backend
const { data } = await supabase.functions.invoke("gmail-oauth", {
  body: { action: "get-config" }
});

// Utiliser le champ `connected` retourne par le backend
// (verifie access_token_enc ET token_nonce)
setConfig({
  connected: data.connected, // true seulement si tokens presents
  email: data.config?.user_email,
  // ...
});

// Si config existe mais connected=false, afficher un avertissement
if (data.config && !data.connected) {
  toast.warning("Les tokens Gmail ont expire. Veuillez reconnecter votre compte.");
}
```

### Modification 2: GmailConfig.tsx -- bouton reconnexion

Ajouter en haut de la page un bandeau d'alerte visible quand `config.email` existe mais `config.connected` est false:

```typescript
{config.email && !config.connected && (
  <Alert variant="destructive">
    <AlertTriangle />
    <AlertTitle>Reconnexion necessaire</AlertTitle>
    <AlertDescription>
      Gmail ({config.email}) necessite une reconnexion pour synchroniser vos emails.
      <Button onClick={handleConnectGmail}>Reconnecter Gmail</Button>
    </AlertDescription>
  </Alert>
)}
```

### Modification 3: AnalysisPipeline.tsx -- lien vers reconnexion

Quand le pipeline affiche "Gmail non connecte", transformer le message en lien cliquable:

```typescript
// Au lieu de juste afficher "Gmail non connecte"
<Link to="/gmail-config">
  Gmail non connecte - Cliquer pour configurer
</Link>
```

---

## Fichiers a modifier

1. `src/pages/GmailConfig.tsx` -- detection fiable des tokens + bouton reconnexion
2. `src/pages/AnalysisPipeline.tsx` -- lien vers la config Gmail quand deconnecte

## Resultat attendu

- La page Gmail affichera clairement si les tokens sont valides ou non
- Un bouton "Reconnecter Gmail" sera visible quand les tokens manquent
- Apres reconnexion, le pipeline pourra synchroniser et analyser tous vos emails
