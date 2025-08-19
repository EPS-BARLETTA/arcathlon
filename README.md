# Arcathlon Spirale v3.2 – QR “Bilan” (ScanProf)

- Bouton **QR Bilan** : génère un QR scannable.
  - **Format Arcathlon (points)** : `[ { nom, prenom, classe, sexe, points_total, vainqueur }, ... ]`
  - **Format ScanProf v4** : `[ { nom, prenom, classe, sexe, "200":"M:SS" } ]` (on encode le cumul de points en `M:SS` juste pour compat — si votre app attend des temps).
- **Ciné-mode** plein écran auto pendant les déplacements (activable en haut).
- Saisie 0/6/7/8/9/10, calcul animé, déplacements en spirale, cases objectif/mystère, annulation animée, confettis.

Déploiement : pousser sur GitHub Pages (branche `main`, folder `/`).

