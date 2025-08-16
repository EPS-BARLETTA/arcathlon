# Arcathlon — QR & Observateurs (plugin)

Ce plugin ajoute à `arc.html` un bouton **“QR & Observateurs”** qui :
- lit le **Tableau récapitulatif** (Phase, Temps (s), Vitesse (km/h), Score),
- calcule **Total (s)**, **Vitesse moyenne** et **Score total**,
- ajoute des champs **Observateur / Météo / Vent / Remarques**,
- génère un **QR code** (fond blanc, quiet-zone) téléchargeable en **PNG**,
- et montre le **JSON** copiable (format `[ { ...payload... } ]`).

## Installation

1) Ouvrez `arc.html` et ajoutez ces deux lignes juste avant `</body>` :

```html
<script src="https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs/qrcode.min.js"></script>
<script src="./arcathlon-qr-observateurs.js"></script>
```

> Si vous ne souhaitez pas inclure la première ligne, le plugin **chargera automatiquement** la librairie QRCode depuis le CDN si elle est absente.

2) Enregistrez `arcathlon-qr-observateurs.js` dans le **même dossier** que `arc.html` ou adaptez le chemin du `<script>`.

## Utilisation

- Cliquez sur le bouton flottant **“QR & Observateurs”** (en bas à droite).
- Renseignez l’identité + options pour les observateurs.
- Cliquez **“Lire le tableau & Préparer le QR”** pour créer le JSON et le QR.
- **Copier le JSON** ou **Télécharger le QR (PNG)**.
- **Plein écran** disponible pour un scan facile.

## Format JSON (exemple)

```json
[{
  "Mode": "Arcathlon",
  "nom": "Martin",
  "prenom": "Julie",
  "classe": "4C",
  "sexe": "F",
  "Observateur": "M. Dupont",
  "Meteo": "Nuageux",
  "Vent": "Modéré",
  "Remarques": "Bonne transition.",
  "Total_s": 123.45,
  "Vitesse_moy_kmh": 12.34,
  "Score_total": 67,
  "Phases": [
    {"Phase":"P1","Temps_s":45,"Vitesse_kmh":13.2,"Score":20},
    {"Phase":"P2","Temps_s":50,"Vitesse_kmh":12.5,"Score":22}
  ]
}]
```

## Remarques

- Le plugin **détecte automatiquement** le tableau récapitulatif en recherchant des en-têtes contenant *Phase*, *Temps*, *Vitesse*, *Score*. Si plusieurs tableaux existent, il prend le plus pertinent.
- Si vous souhaitez un **schéma strict ScanProf**, donnez le format attendu — je l’adapterai (clés exactes, arrondis, etc.).
