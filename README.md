# LanfiaSave — Applications mobiles

Deux applications React Native (Expo SDK 58), sur la charte LanfiaLink : gros contrôles tactiles, un seul bouton
principal par écran, textes courts, utilisables en plein soleil et par des publics peu familiers du numérique.

| Dossier | Application | Public |
|---|---|---|
| [`collecte/`](collecte) | **LanfiaSave Collecte** | Agents recenseurs et superviseurs terrain |
| [`parcours/`](parcours) | **LanfiaSave Mon Parcours** | Bénéficiaires |

Dépôts associés : `backend-lanfiasave` (API) et `dashboard-lanfiasave` (portail web).

## API

Les deux applications utilisent par défaut l'API de production :
**https://backend-lanfiasave-uwy5.vercel.app/api/v1** (constante `PRODUCTION_API_URL` dans `src/api.ts`, et
`EXPO_PUBLIC_API_URL` dans les profils `preview`/`production` de `eas.json`).

- Développement contre une API locale : `EXPO_PUBLIC_API_URL=http://<IP du poste>:8000/api/v1 npx expo start`.
- Sur le terrain : un **appui long sur le logo** de l'écran de connexion ouvre le réglage de l'adresse du serveur.

## LanfiaSave Collecte

- Connexion de l'agent, puis téléchargement du « pack terrain » (questionnaire publié + localités).
- Assistant « Nouveau ménage » pas à pas : lieu (GPS uniquement avec accord), membres (aucune pièce d'identité
  exigée), 12 rubriques du questionnaire avec « Ne sait pas / Refus / Non applicable », récapitulatif.
- **Rattachement à une opération** (déguerpissement, inondation, site minier…) : un dossier de suivi est ouvert
  automatiquement pour chaque membre du ménage.
- **Situations particulières** par personne (handicap, grossesse, orphelin, sans acte de naissance…), à confirmer
  ensuite par un travailleur social.
- Brouillon enregistré à chaque saisie : reprise après fermeture, batterie vide ou plantage.
- **Hors connexion** : file d'envoi locale, envoi automatique au retour du réseau, sans doublon
  (Idempotency-Key + identifiant généré sur le téléphone).
- Jetons dans le trousseau sécurisé (`expo-secure-store`).

## LanfiaSave Mon Parcours

- Connexion avec le **code dossier** (fiche remise par l'agent) et un **code PIN à 6 chiffres** sur grand pavé.
- Suivi de chaque demande étape par étape, décision et motif en langage clair.
- **Mes aides** : aides reçues et prévues, avec la structure qui les apporte.
- **Mon dossier d'accompagnement** après un déguerpissement ou un sinistre : statut, besoins pris en compte,
  site de relogement.
- **Recours** directement depuis l'application ; page « Mes droits ».
- Le score interne et les notes du comité ne sont jamais affichés.

## Démarrage

```bash
cd collecte   # ou parcours
npm install
npx expo start
```

Scanner le QR code avec **Expo Go**, ou lancer `i` (simulateur iOS) / `a` (émulateur Android).

## Publication (EAS, compte `samajeste01`)

```bash
npx eas-cli@latest update --branch preview --message "…"          # mise à jour à distance (OTA)
npx eas-cli@latest build --profile preview --platform android     # APK d'installation interne
npx eas-cli@latest build --profile production --platform all      # versions stores
```

Projets Expo : `lanfiasave-collecte` et `lanfiasave-mon-parcours`.

## Qualité

```bash
npx tsc --noEmit && npx expo lint && npx expo-doctor
```

La CI (`.github/workflows/ci.yml`) exécute la vérification des types et le lint des deux applications.

Les icônes sont générées par `tools/make-icons.swift` (macOS).
