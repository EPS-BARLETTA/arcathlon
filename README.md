# Arcathlon — QR & Observateurs (plugin)

Ajoute un bouton **“QR & Observateurs”** dans `arc.html` :
- Lit le **Tableau récapitulatif**.
- Calcule total (s), vitesse moyenne (km/h), score total.
- Champs Observateur / Météo / Vent / Remarques.
- Génère un **QR** (fond blanc) + **PNG** + **JSON** copiable.

## Installation
Avant `</body>` dans `arc.html` :
```html
<script src="https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs/qrcode.min.js"></script>
<script src="./arcathlon-qr-observateurs.js"></script>
```
