# 🐣 Jeu de l'Oie – Multi (GitHub Pages Ready)

Application web **multijoueurs** (sur le même appareil) sans backend, 100% compatible **GitHub Pages**.

## 🚀 Déploiement
1. Créez un dépôt GitHub (ex: `JeuOieMulti`).
2. Uploadez l'intégralité des fichiers de ce dossier (ou poussez le ZIP décompressé).
3. Dans `Settings > Pages`, sélectionnez la branche `main` et le dossier `/ (root)`.
4. Votre jeu sera accessible à l'URL GitHub Pages.

## 🧑‍💻 Utilisation
- **Nouvelle partie** : choisissez 2–8 joueurs, 1 ou 2 dés, donnez un nom/couleur.
- **Plateau** : par défaut 63 cases. Vous pouvez **importer** un plateau au format JSON/CSV.
- **Sauvegarde** : export/import d'une partie (`oie-sauvegarde.json`). Une copie est aussi conservée
  dans `localStorage` (navigateur).

## 📥 Formats d'import
### Joueurs (CSV)
```
nom,couleur
Alice,#ff6b6b
Bob,#4dabf7
```
La colonne `couleur` est facultative.

### Plateau (CSV)
```
index,label,type,valeur
3,Pont +2,advance,2
6,Oie +2,advance,2
9,Rejoue,roll_again,0
12,Glissade -2,back,2
```
- `type` possibles : `advance`, `back`, `skip`, `roll_again`, `teleport`, ou vide (neutre).
- La case **0** est le **Départ** et la dernière case est l'**Arrivée**.

## 📱 Pensé pour tablette/smartphone
- Gros boutons tactiles, zoom sur le plateau, autoscroll vers le pion courant.

## 🔧 Personnalisation
- Styles : `styles.css`
- Logique : `app.js`
- Plateau par défaut : `data/board-default.json`

---
Fait pour un déploiement simple, **aucun serveur requis**. Amusez-vous bien ! 🎲
