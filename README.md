# Arcathlon – Jeu de l'Oie (Multijoueurs local)

Version corrigée, **prête GitHub Pages**.
- Plateau par défaut : `data/board-default.json` (référence alignée dans `index.html`).
- Correctif : l'écouteur `input` des joueurs est attaché **une seule fois** (plus de doublons).
- Fallback : si le plateau ne se charge pas, un plateau 63 cases est généré côté client.

## Déploiement (GitHub Pages)
1. Poussez ces fichiers à la racine du dépôt (`main`).
2. `Settings → Pages` → Source `main`, dossier `/`.
3. Ouvrez l'URL Pages.

## Imports
- Joueurs CSV : `nom,couleur` (couleur optionnelle).
- Plateau CSV : `index,label,type,valeur`.
Types : `advance`, `back`, `skip`, `roll_again`, `teleport`.

Amusez-vous bien 🎲
